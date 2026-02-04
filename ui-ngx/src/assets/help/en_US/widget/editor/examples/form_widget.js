self.onInit = function() {
    function emptyFormData() {
        return {
            firstName: '',
            lastName: '',
            email: '',
            meters: []
        };
    }

    self.ctx.$scope.formData = emptyFormData();
    self.ctx.$scope.formSavedPayload = '';
    self.ctx.$scope.toastTargetId = self.ctx.toastTargetId;

    self.ctx.$scope.removeMeter = function(index) {
        self.ctx.$scope.formData.meters.splice(index, 1);
    };

    self.ctx.$scope.trackByIndex = function(index) {
        return index;
    };

    self.ctx.$scope.isMeterIdDuplicate = function(meterId, index) {
        if (!meterId) {
            return false;
        }
        return self.ctx.$scope.formData.meters.some(function (meter, meterIndex) {
            return meterIndex !== index && meter.meterId === meterId;
        });
    };

    function hasDuplicateMeterIds() {
        var ids = {};
        return self.ctx.$scope.formData.meters.some(function (meter) {
            if (!meter.meterId) {
                return false;
            }
            if (ids[meter.meterId]) {
                return true;
            }
            ids[meter.meterId] = true;
            return false;
        });
    }

    self.ctx.$scope.resetForm = function(form) {
        if (form) {
            form.resetForm();
        }
        self.ctx.$scope.formData = emptyFormData();
        self.ctx.$scope.formSavedPayload = '';
        self.ctx.detectChanges();
    };

    self.ctx.$scope.openMeterDialog = function(index, event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        self.ctx.$scope.editingMeterIndex = typeof index === 'number' ? index : null;
        var sourceMeter = typeof index === 'number' ? self.ctx.$scope.formData.meters[index] : createEmptyMeter();
        self.ctx.$scope.meterDraft = cloneMeter(sourceMeter);
        self.ctx.$scope.meterDialogTitle = typeof index === 'number' ? 'Zähler bearbeiten' : 'Zähler hinzufügen';
        self.ctx.$scope.meterDialogVisible = true;
        self.ctx.detectChanges();
    };

    self.ctx.$scope.closeMeterDialog = function() {
        self.ctx.$scope.meterDialogVisible = false;
        self.ctx.detectChanges();
    };

    self.ctx.$scope.saveMeterDialog = function() {
        if (!self.ctx.$scope.meterDraft.name || !self.ctx.$scope.meterDraft.meterId ||
            !self.ctx.$scope.meterDraft.medium || !self.ctx.$scope.meterDraft.startDate) {
            return;
        }
        if (self.ctx.$scope.isMeterIdDuplicate(self.ctx.$scope.meterDraft.meterId, self.ctx.$scope.editingMeterIndex)) {
            self.ctx.showErrorToast('Zählernummer muss eindeutig sein.', 'top', 'center', self.ctx.$scope.toastTargetId, true);
            return;
        }
        var draftCopy = cloneMeter(self.ctx.$scope.meterDraft);
        if (typeof self.ctx.$scope.editingMeterIndex === 'number') {
            self.ctx.$scope.formData.meters[self.ctx.$scope.editingMeterIndex] = draftCopy;
        } else {
            self.ctx.$scope.formData.meters.push(draftCopy);
        }
        self.ctx.$scope.meterDialogVisible = false;
        self.ctx.detectChanges();
    };

    self.ctx.$scope.saveForm = function(form) {
        if (form && form.invalid) {
            return;
        }
        if (hasDuplicateMeterIds()) {
            self.ctx.showErrorToast('Zählernummer muss eindeutig sein.', 'top', 'center', self.ctx.$scope.toastTargetId, true);
            return;
        }
        var metersPayload = self.ctx.$scope.formData.meters.map(function (meter) {
            return {
                name: meter.name,
                meterId: meter.meterId,
                medium: meter.medium,
                mountingAddress: meter.mountingAddress,
                mountingLocation: meter.mountingLocation,
                melo: meter.melo,
                startTimeMs: toMidnightMs(meter.startDate),
                endTimeMs: toMidnightMs(meter.endDate)
            };
        });
        var payload = [
            {
                key: self.ctx.$scope.formData.email,
                value: {
                    firstName: self.ctx.$scope.formData.firstName,
                    lastName: self.ctx.$scope.formData.lastName,
                    email: self.ctx.$scope.formData.email,
                    meters: metersPayload
                }
            }
        ];
        self.ctx.attributeService.saveEntityTimeseries(
            self.ctx.defaultSubscription.targetEntityId,
            'TELEMETRY',
            payload
        ).subscribe(function () {
            createUserGroups(function () {
                createUserAccount(function () {
                    createUserDevices(function () {
                        self.ctx.showSuccessToast('Gespeichert', 3000, 'top', 'center', self.ctx.$scope.toastTargetId, true);
                        self.ctx.$scope.formSavedPayload = JSON.stringify(self.ctx.$scope.formData, null, 2);
                        self.ctx.detectChanges();
                    });
                });
            });
        }, function () {
            handleSaveError('Fehler beim Speichern der Telemetrie.');
        });
    };

    function toMidnightMs(dateValue) {
        if (!dateValue) {
            return null;
        }
        var date = new Date(dateValue);
        date.setHours(0, 0, 0, 0);
        return date.getTime();
    }

    function createEmptyMeter() {
        return {
            name: '',
            meterId: '',
            medium: '',
            mountingAddress: '',
            mountingLocation: '',
            melo: '',
            startDate: null,
            endDate: null
        };
    }

    function cloneMeter(meter) {
        return {
            name: '',
            meterId: '',
            medium: '',
            mountingAddress: '',
            mountingLocation: '',
            melo: '',
            startDate: null,
            endDate: null,
            ...meter,
            startDate: meter.startDate ? new Date(meter.startDate) : null,
            endDate: meter.endDate ? new Date(meter.endDate) : null
        };
    }

    function createUserGroups(done) {
        var groupName = self.ctx.$scope.formData.lastName + ', ' + self.ctx.$scope.formData.firstName;
        saveEntityGroup({ type: 'USER', name: groupName }).subscribe(function (userGroup) {
            var userGroupId = userGroup && userGroup.id ? userGroup.id.id : null;
            saveEntityGroupPermission(userGroupId, function () {
                saveEntityGroup({ type: 'ENTITY_VIEW', name: groupName }).subscribe(function () {
                    if (done) {
                        done();
                    }
                }, function () {
                    handleSaveError('Fehler beim Anlegen der Entityview Group.');
                });
            });
        }, function () {
            handleSaveError('Fehler beim Anlegen der User Group.');
        });
    }

    function createUserDevices(done) {
        var meters = self.ctx.$scope.formData.meters;
        if (!meters.length) {
            if (done) {
                done();
            }
            return;
        }
        var pending = meters.length;
        var completed = false;
        meters.forEach(function (meter) {
            var deviceName = (meter.meterId || '').toUpperCase();
            if (!deviceName) {
                pending -= 1;
                if (!pending && done && !completed) {
                    completed = true;
                    done();
                }
                return;
            }
            self.ctx.deviceService.saveDevice({ name: deviceName, type: '@CMS/Cosem' }).subscribe(function (device) {
                var deviceId = device.id && device.id.id ? device.id.id : device.id;
                var entityId = {
                    entityType: 'DEVICE',
                    id: deviceId
                };
                var sharedAttributes = [
                    { key: '_meterid', value: meter.meterId },
                    { key: '_medium', value: meter.medium },
                    { key: '_location', value: meter.mountingAddress },
                    { key: '_mounting', value: meter.mountingLocation },
                    { key: '_melo', value: meter.melo }
                ];
                var serverAttributes = [
                    { key: 'inactivityTimeout', value: 172800000 }
                ];
                self.ctx.attributeService.saveEntityAttributes(entityId, 'SHARED_SCOPE', sharedAttributes).subscribe(function () {
                    self.ctx.attributeService.saveEntityAttributes(entityId, 'SERVER_SCOPE', serverAttributes).subscribe(function () {
                        linkDeviceToBtcAsset(entityId, function () {
                            pending -= 1;
                            if (!pending && done && !completed) {
                                completed = true;
                                done();
                            }
                        });
                    }, function () {
                        handleSaveError('Fehler beim Schreiben der Server-Attribute.');
                    });
                }, function () {
                    handleSaveError('Fehler beim Schreiben der Shared-Attribute.');
                });
            }, function () {
                handleSaveError('Fehler beim Anlegen des Devices.');
            });
        });
    }

    function linkDeviceToBtcAsset(deviceEntityId, done) {
        var btcAssetId = {
            entityType: 'ASSET',
            id: 'b2a50670-832a-11f0-81aa-a7e4f7445338'
        };
        self.ctx.entityRelationService.saveRelation({
            from: deviceEntityId,
            to: btcAssetId,
            type: 'Contains',
            typeGroup: 'COMMON'
        }).subscribe(function () {
            if (done) {
                done();
            }
        }, function () {
            handleSaveError('Fehler beim Erstellen der BTC-Asset Beziehung.');
        });
    }

    function saveEntityGroup(group) {
        if (self.ctx.entityGroupService && self.ctx.entityGroupService.saveEntityGroup) {
            return self.ctx.entityGroupService.saveEntityGroup(group);
        }
        return self.ctx.http.post('/api/entityGroup', group);
    }

    function saveEntityGroupPermission(userGroupId, done) {
        if (!userGroupId) {
            if (done) {
                done();
            }
            return;
        }
        var roleId = '0b0ea2b0-36e3-11f0-9416-e1bdecd1c374';
        var body = {
            entityGroupId: userGroupId,
            roleId: roleId
        };
        self.ctx.http.post('/api/entityGroup/permissions', body).subscribe(function () {
            if (done) {
                done();
            }
        }, function () {
            handleSaveError('Fehler beim Setzen der Gruppenberechtigung.');
        });
    }

    function createUserAccount(done) {
        self.ctx.userService.saveUser({
            email: self.ctx.$scope.formData.email,
            authority: 'CUSTOMER_USER',
            firstName: self.ctx.$scope.formData.firstName,
            lastName: self.ctx.$scope.formData.lastName,
            customMenuId: {
                id: '7728f1d0-36e8-11f0-9416-e1bdecd1c374'
            }
        }).subscribe(function () {
            if (done) {
                done();
            }
        }, function () {
            handleSaveError('Fehler beim Anlegen des Users.');
        });
    }

    function handleSaveError(message) {
        self.ctx.$scope.formSavedPayload = message;
        self.ctx.detectChanges();
    }
};
