self.onInit = function() {
    var rx = self.ctx.rxjs;
    var saveFailed = false;
    var rollbackRunning = false;
    var benutzerEdlGroupId = null;
    var benutzerEdlGroupChecked = false;
    var benutzerEdlGroupMissing = false;
    var stateChangedSubscription = null;
    var lastSelectedUserId = null;
    var createdEntities = {
        userId: null,
        userGroupId: null,
        entityViewGroupId: null,
        deviceIds: [],
        entityViewIds: []
    };

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
    self.ctx.$scope.formReport = [];
    self.ctx.$scope.selectedUserId = null;
    self.ctx.$scope.selectedUserCustomerId = null;
    self.ctx.$scope.toastTargetId = self.ctx.toastTargetId;

    loadSelectedUserFromDashboardState();
    watchDashboardStateChanges();
    checkBenutzerEdlGroupOnInit();

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
        self.ctx.$scope.formReport = [];
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
        if (!self.ctx.$scope.meterDraft.meterId ||
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
        self.ctx.$scope.formReport = [];
        self.ctx.attributeService.saveEntityTimeseries(
            self.ctx.defaultSubscription.targetEntityId,
            'TELEMETRY',
            payload
        ).pipe(
            rx.switchMap(() => createUserGroups$()),
            rx.switchMap((groupContext) => createUserAccount$(groupContext).pipe(
                rx.switchMap((user) => linkUserToBtcAsset$(user).pipe(
                    rx.map(() => groupContext)
                ))
            )),
            rx.switchMap((groupContext) => createUserDevices$(groupContext))
        ).subscribe(() => {
            self.ctx.showSuccessToast('Gespeichert', 3000, 'top', 'center', self.ctx.$scope.toastTargetId, true);
            self.ctx.detectChanges();
        }, () => {
            if (!saveFailed) {
                handleSaveError('Fehler beim Speichern der Telemetrie.');
            }
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

    function createUserGroups$() {
        var groupName = self.ctx.$scope.formData.lastName + ', ' + self.ctx.$scope.formData.firstName;
        return saveEntityGroup({
            type: 'ENTITY_VIEW',
            name: groupName,
            description: "auto-generated by 'btc create customer' widget"
        }).pipe(
            rx.switchMap((entityViewGroup) => {
                createdEntities.entityViewGroupId = entityViewGroup && entityViewGroup.id ? entityViewGroup.id.id : null;
                pushReport('EntityView Group erstellt: ' + groupName);
                return saveEntityGroup({
                    type: 'USER',
                    name: groupName,
                    description: "auto-generated by 'btc create customer' widget"
                }).pipe(
                    rx.switchMap((userGroup) => {
                        var userGroupIdEntity = userGroup ? userGroup.id : null;
                        var userGroupIdId = userGroupIdEntity && userGroupIdEntity.id ? userGroupIdEntity.id : userGroupIdEntity;
                        createdEntities.userGroupId = userGroupIdId;
                        pushReport('User Group erstellt: ' + groupName);
                        return getBenutzerEdlGroupIdForShare$().pipe(
                            rx.switchMap((benutzerEdlGroupId) => shareEntityGroupToUserGroup$(
                                createdEntities.entityViewGroupId,
                                benutzerEdlGroupId || userGroupIdId
                            )),
                            rx.map(() => ({
                                entityViewGroupId: createdEntities.entityViewGroupId,
                                userGroupIdId: userGroupIdId
                            }))
                        );
                    })
                );
            }),
            rx.catchError((error) => {
                handleSaveError('Fehler beim Anlegen der User Group.');
                return rx.throwError(() => error);
            })
        );
    }

    function createUserDevices$(groupContext) {
        var meters = self.ctx.$scope.formData.meters;
        if (!meters.length) {
            return rx.of(null);
        }
        return rx.from(meters).pipe(
            rx.concatMap((meter) => createDeviceForMeter$(meter).pipe(
                rx.switchMap((deviceContext) => createEntityViewForDevice$(
                    deviceContext,
                    groupContext
                ))
            )),
            rx.toArray(),
            rx.catchError((error) => {
                handleSaveError('Fehler beim Anlegen der Devices.');
                return rx.throwError(() => error);
            })
        );
    }

    function createDeviceForMeter$(meter) {
        var deviceName = (meter.meterId || '').toUpperCase();
        if (!deviceName) {
            return rx.of(null);
        }
        return self.ctx.deviceService.saveDevice({
            name: deviceName,
            type: '@CMS/Cosem',
            additionalInfo: {
                description: "auto-generated by 'btc create customer' widget"
            }
        }).pipe(
            rx.switchMap((device) => {
                var deviceId = device.id && device.id.id ? device.id.id : device.id;
                createdEntities.deviceIds.push(deviceId);
                pushReport('Device erstellt: ' + deviceName);
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
                return self.ctx.attributeService.saveEntityAttributes(entityId, 'SHARED_SCOPE', sharedAttributes).pipe(
                    rx.switchMap(() => self.ctx.attributeService.saveEntityAttributes(entityId, 'SERVER_SCOPE', serverAttributes)),
                    rx.switchMap(() => linkDeviceToBtcAsset$(entityId)),
                    rx.map(() => ({
                        deviceId: deviceId,
                        entityId: entityId,
                        meter: meter,
                        deviceName: deviceName
                    }))
                );
            }),
            rx.catchError((error) => {
                handleSaveError('Fehler beim Anlegen des Devices.');
                return rx.throwError(() => error);
            })
        );
    }

    function createEntityViewForDevice$(deviceContext, groupContext) {
        var timeseriesKeys = [];
        var csKeys = [];
        var ssKeys = [];
        var shKeys = [];
        return self.ctx.entityViewService.saveEntityView({
            name: deviceContext.deviceName,
            type: 'EDL',
            entityId: {
                entityType: 'DEVICE',
                id: deviceContext.deviceId
            },
            entityViewGroupId: groupContext ? groupContext.entityViewGroupId : null,
            keys: {
                timeseries: timeseriesKeys,
                attributes: {
                    cs: csKeys,
                    ss: ssKeys,
                    sh: shKeys
                }
            },
            startTimeMs: toMidnightMs(deviceContext.meter.startDate),
            endTimeMs: toMidnightMs(deviceContext.meter.endDate)
        }).pipe(
            rx.map((entityView) => {
                if (entityView && entityView.id) {
                    createdEntities.entityViewIds.push(entityView.id.id || entityView.id);
                }
                pushReport('EntityView erstellt: ' + deviceContext.deviceName);
                return entityView;
            }),
            rx.catchError((error) => {
                handleSaveError('Fehler beim Anlegen der EntityView.');
                return rx.throwError(() => error);
            })
        );
    }

    function linkDeviceToBtcAsset$(deviceEntityId) {
        var btcAssetId = {
            entityType: 'ASSET',
            id: 'b2a50670-832a-11f0-81aa-a7e4f7445338'
        };
        return self.ctx.entityRelationService.saveRelation({
            from: deviceEntityId,
            to: btcAssetId,
            type: 'Contains',
            typeGroup: 'COMMON'
        }).pipe(
            rx.map((relation) => {
                pushReport('Device -> BTC-Asset Beziehung erstellt.');
                return relation;
            }),
            rx.catchError((error) => {
                handleSaveError('Fehler beim Erstellen der BTC-Asset Beziehung.');
                return rx.throwError(() => error);
            })
        );
    }

    function saveEntityGroup(group) {
        if (self.ctx.entityGroupService && self.ctx.entityGroupService.saveEntityGroup) {
            return self.ctx.entityGroupService.saveEntityGroup(group);
        }
        return self.ctx.http.post('/api/entityGroup', group);
    }

    function shareEntityGroupToUserGroup$(entityViewGroupId, userGroupId) {
        if (!userGroupId || !entityViewGroupId) {
            return rx.throwError(() => new Error('Missing group ids'));
        }
        var roleId = '0b0ea2b0-36e3-11f0-9416-e1bdecd1c374';
        var url = '/api/entityGroup/' + entityViewGroupId + '/' + userGroupId + '/' + roleId + '/share';
        return self.ctx.http.post(url, null).pipe(
            rx.map((result) => {
                pushReport('EntityView Group geteilt.');
                return result;
            }),
            rx.catchError((error) => {
                handleSaveError('Fehler beim Teilen der Entityview Group.');
                return rx.throwError(() => error);
            })
        );
    }

    function checkBenutzerEdlGroupOnInit() {
        getBenutzerEdlGroupIdForShare$().subscribe(() => {
            self.ctx.detectChanges();
        });
    }

    function getBenutzerEdlGroupIdForShare$() {
        if (benutzerEdlGroupChecked) {
            return rx.of(benutzerEdlGroupId);
        }
        return resolveBenutzerEdlGroupId$();
    }

    function resolveBenutzerEdlGroupId$() {
        return self.ctx.http.get('/api/entityGroups/USER?pageSize=100&page=0&textSearch=' + encodeURIComponent('Benutzer EDL')).pipe(
            rx.map((pageData) => {
                var groups = pageData && pageData.data ? pageData.data : [];
                var found = groups.find((group) => group && group.name === 'Benutzer EDL');
                var groupId = found && found.id ? (found.id.id || found.id) : null;
                benutzerEdlGroupChecked = true;
                benutzerEdlGroupId = groupId;
                if (!groupId) {
                    benutzerEdlGroupMissing = true;
                    self.ctx.showWarnToast('Nutzergruppe "Benutzer EDL" wird für die vollständige Anlage benötigt.', 'top', 'center', self.ctx.$scope.toastTargetId, true);
                    return null;
                }
                benutzerEdlGroupMissing = false;
                return groupId;
            }),
            rx.catchError((error) => {
                benutzerEdlGroupChecked = true;
                benutzerEdlGroupId = null;
                benutzerEdlGroupMissing = false;
                return rx.of(null);
            })
        );
    }

    function createMissingBenutzerEdlAlarmForUser$(userEmail) {
        if (!self.ctx.defaultSubscription || !self.ctx.defaultSubscription.targetEntityId) {
            return rx.of(null);
        }
        var originator = self.ctx.defaultSubscription.targetEntityId;
        var alarmPayload = {
            type: 'MISSING_BENUTZER_EDL_GROUP',
            severity: 'WARNING',
            originator: originator,
            propagate: false,
            details: {
                message: 'Nutzer wurde nicht zur Gruppe "Benutzer EDL" hinzugefügt, weil die Gruppe nicht existiert.',
                userEmail: userEmail,
                description: "auto-generated by 'btc create customer' widget"
            }
        };
        return self.ctx.alarmService.saveAlarm(alarmPayload).pipe(
            rx.map((alarm) => {
                pushReport('Alarm erstellt: Gruppe "Benutzer EDL" fehlt (User: ' + userEmail + ').');
                return alarm;
            }),
            rx.catchError((error) => {
                pushReport('WARNUNG: Alarm für fehlende Gruppe "Benutzer EDL" konnte nicht erstellt werden.');
                return rx.of(null);
            })
        );
    }

    function createUserAccount$(groupContext) {
        var customerId = self.ctx.$scope.selectedUserCustomerId || '6c4d7b80-efbd-11f0-99ef-5142a24e3d47';
        var userPayload = {
            email: self.ctx.$scope.formData.email,
            authority: 'CUSTOMER_USER',
            firstName: self.ctx.$scope.formData.firstName,
            lastName: self.ctx.$scope.formData.lastName,
            customerId: {
                entityType: 'CUSTOMER',
                id: customerId
            },
            additionalInfo: {
                description: "auto-generated by 'btc create customer' widget"
            },
            customMenuId: {
                id: '7728f1d0-36e8-11f0-9416-e1bdecd1c374'
            }
        };
        if (self.ctx.$scope.selectedUserId) {
            userPayload.id = {
                entityType: 'USER',
                id: self.ctx.$scope.selectedUserId
            };
        }
        var saveUserUrl = '/api/user?sendActivationMail=true&entityGroupId=' + encodeURIComponent(groupContext.userGroupIdId);
        return self.ctx.http.post(saveUserUrl, userPayload).pipe(
            rx.map((user) => {
                if (user && user.id) {
                    createdEntities.userId = user.id.id || user.id;
                }
                if (self.ctx.$scope.selectedUserId) {
                    pushReport('User aktualisiert: ' + self.ctx.$scope.formData.email);
                } else {
                    pushReport('User erstellt: ' + self.ctx.$scope.formData.email);
                }
                if (benutzerEdlGroupMissing) {
                    pushReport('Hinweis: Zuordnung zur Nutzergruppe "Benutzer EDL" fehlt noch, da die Gruppe nicht existiert.');
                    createMissingBenutzerEdlAlarmForUser$(self.ctx.$scope.formData.email).subscribe();
                }
                return user;
            }),
            rx.catchError((error) => {
                handleSaveError('Fehler beim Anlegen des Users.');
                return rx.throwError(() => error);
            })
        );
    }

    function watchDashboardStateChanges() {
        if (!self.ctx.stateController || !self.ctx.stateController.stateChanged) {
            return;
        }
        stateChangedSubscription = self.ctx.stateController.stateChanged().subscribe(() => {
            loadSelectedUserFromDashboardState();
        });
    }



    function loadSelectedUserFromDashboardState() {
        var selectedUserId = extractSelectedUserId();
        if (!selectedUserId) {
            clearSelectedUser();
            return;
        }
        if (lastSelectedUserId === selectedUserId) {
            return;
        }
        self.ctx.userService.getUser(selectedUserId).subscribe((user) => {
            lastSelectedUserId = selectedUserId;
            self.ctx.$scope.selectedUserId = selectedUserId;
            self.ctx.$scope.selectedUserCustomerId = user && user.customerId ? (user.customerId.id || user.customerId) : null;
            self.ctx.$scope.formData.firstName = user.firstName || '';
            self.ctx.$scope.formData.lastName = user.lastName || '';
            self.ctx.$scope.formData.email = user.email || '';
            pushReport('Vorhandener User geladen: ' + self.ctx.$scope.formData.email);
            self.ctx.detectChanges();
        }, () => {
            handleSaveError('Fehler beim Laden des selektierten Users.');
        });
    }

    self.onDestroy = function() {
        if (stateChangedSubscription) {
            stateChangedSubscription.unsubscribe();
            stateChangedSubscription = null;
        }
    };

    function clearSelectedUser() {
        lastSelectedUserId = null;
        self.ctx.$scope.selectedUserId = null;
        self.ctx.$scope.selectedUserCustomerId = null;
        self.ctx.$scope.formData = emptyFormData();
        self.ctx.detectChanges();
    }

    function extractSelectedUserId() {
        var stateParams = self.ctx.stateController && self.ctx.stateController.getStateParams ? self.ctx.stateController.getStateParams() : null;
        if (!stateParams || !stateParams.selecteUser) {
            return null;
        }
        return stateParams.selecteUser.id;
    }

    function linkUserToBtcAsset$(user) {
        if (!user || !user.id) {
            return rx.throwError(() => new Error('Missing user id'));
        }
        var userId = user.id.id || user.id;
        var userEntityId = {
            entityType: 'USER',
            id: userId
        };
        var btcAssetId = {
            entityType: 'ASSET',
            id: 'b2a50670-832a-11f0-81aa-a7e4f7445338'
        };
        return self.ctx.entityRelationService.saveRelation({
            from: userEntityId,
            to: btcAssetId,
            type: 'Contains',
            typeGroup: 'COMMON'
        }).pipe(
            rx.map((relation) => {
                pushReport('User -> BTC-Asset Beziehung erstellt.');
                return relation;
            }),
            rx.catchError((error) => {
                handleSaveError('Fehler beim Erstellen der User-BTC Beziehung.');
                return rx.throwError(() => error);
            })
        );
    }

 

    function handleSaveError(message) {
        saveFailed = true;
        pushReport('Fehler: ' + message);
        self.ctx.detectChanges();
        if (!rollbackRunning) {
            rollbackRunning = true;
            rollbackEntities$().subscribe(() => {
                rollbackRunning = false;
            });
        }
    }

    function pushReport(message) {
        self.ctx.$scope.formReport.push(message);
    }

    function rollbackEntities$() {
        var deletions = [];
        createdEntities.entityViewIds.forEach((entityViewId) => {
            deletions.push(() => self.ctx.entityViewService.deleteEntityView(entityViewId));
        });
        createdEntities.deviceIds.forEach((deviceId) => {
            deletions.push(() => self.ctx.deviceService.deleteDevice(deviceId));
        });
        if (createdEntities.userId) {
            deletions.push(() => self.ctx.userService.deleteUser(createdEntities.userId));
        }
        if (createdEntities.userGroupId) {
            deletions.push(() => self.ctx.http.delete('/api/entityGroup/' + createdEntities.userGroupId));
        }
        if (createdEntities.entityViewGroupId) {
            deletions.push(() => self.ctx.http.delete('/api/entityGroup/' + createdEntities.entityViewGroupId));
        }
        if (!deletions.length) {
            return rx.of(null);
        }
        return rx.from(deletions).pipe(
            rx.concatMap((deleteFn) => deleteFn().pipe(rx.catchError(() => rx.of(null)))),
            rx.toArray()
        );
    }
};
