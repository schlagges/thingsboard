#### Sample Form widget (Person + meters)

<div class="divider"></div>
<br/>

- Put the following HTML code inside the HTML tab of "Resources" section:

```html
<div class="mb-2" tb-toast toastTarget="{{toastTargetId}}"></div>
<form *ngIf="formData" #personForm="ngForm" (submit)="saveForm(personForm)">
  <div class="mat-content mat-padding flex flex-col">
    <div class="flex flex-col gap-4">
      <mat-form-field class="mat-block">
        <mat-label>Vorname</mat-label>
        <input matInput required name="firstName" #firstNameField="ngModel" [(ngModel)]="formData.firstName" />
        <mat-error *ngIf="firstNameField.hasError('required')">
          Vorname ist erforderlich.
        </mat-error>
      </mat-form-field>

      <mat-form-field class="mat-block">
        <mat-label>Name</mat-label>
        <input matInput required name="lastName" #lastNameField="ngModel" [(ngModel)]="formData.lastName" />
        <mat-error *ngIf="lastNameField.hasError('required')">
          Name ist erforderlich.
        </mat-error>
      </mat-form-field>

      <mat-form-field class="mat-block">
        <mat-label>E-Mail</mat-label>
        <input matInput required email name="email" #emailField="ngModel" [(ngModel)]="formData.email" />
        <mat-error *ngIf="emailField.hasError('required')">
          E-Mail ist erforderlich.
        </mat-error>
        <mat-error *ngIf="emailField.hasError('email')">
          Bitte eine gültige E-Mail angeben.
        </mat-error>
      </mat-form-field>
    </div>

    <div class="mat-title">Zähler</div>
    <div class="flex flex-col gap-2">
      <div class="meter-row" *ngFor="let meter of formData.meters; let i = index; trackBy: trackByIndex">
        <div class="meter-summary-line mat-body-2">
          <span class="meter-col meter-col-id">{{ meter.meterId }}</span>
          <span class="meter-col meter-col-medium">{{ meter.medium }}</span>
          <span class="meter-col meter-col-date">{{ meter.startDate | date:'dd.MM.yyyy' }}</span>
        </div>
        <button type="button" mat-icon-button color="primary" (click)="openMeterDialog(i, $event)" aria-label="Zähler bearbeiten">
          <mat-icon>edit</mat-icon>
        </button>
        <button type="button" mat-icon-button color="warn" (click)="removeMeter(i)" aria-label="Zähler löschen">
          <mat-icon>delete</mat-icon>
        </button>
      </div>
    </div>

    <div class="flex flex-row flex-wrap gap-2 mt-2">
      <button type="button" mat-stroked-button color="primary"
              (click)="openMeterDialog(null, $event)">
        Zähler hinzufügen
      </button>
      <span class="flex-1"></span>
      <button type="button" mat-button (click)="resetForm(personForm)">Zurücksetzen</button>
      <button [disabled]="personForm.invalid" mat-raised-button color="primary" type="submit">
        Speichern
      </button>
    </div>

    <div class="mt-2" *ngIf="formSavedPayload">
      <div class="mat-subheading-2">Aktueller Formular-JSON</div>
      <pre class="mat-body-2">{{ formSavedPayload }}</pre>
    </div>
  </div>

  <div class="meter-dialog-backdrop" *ngIf="meterDialogVisible" (click)="closeMeterDialog()"></div>
  <div class="meter-dialog mat-elevation-z6" *ngIf="meterDialogVisible">
    <div class="mat-title">{{ meterDialogTitle }}</div>
    <div class="flex flex-col gap-4 mt-2">
      <mat-form-field class="mat-block">
        <mat-label>Zähler-Name</mat-label>
        <input matInput required name="dialogName" #dialogNameField="ngModel" [(ngModel)]="meterDraft.name" />
        <mat-error *ngIf="dialogNameField.hasError('required')">Pflichtfeld</mat-error>
      </mat-form-field>
      <mat-form-field class="mat-block">
        <mat-label>Zählernummer</mat-label>
        <input matInput required maxlength="14" name="dialogMeterId" #dialogMeterIdField="ngModel"
               [(ngModel)]="meterDraft.meterId" />
        <mat-error *ngIf="dialogMeterIdField.hasError('required')">Pflichtfeld</mat-error>
        <mat-error *ngIf="isMeterIdDuplicate(meterDraft.meterId, editingMeterIndex)">Zählernummer muss eindeutig sein.</mat-error>
      </mat-form-field>
      <mat-form-field class="mat-block">
        <mat-label>Medium</mat-label>
        <mat-select required name="dialogMedium" #dialogMediumField="ngModel" [(ngModel)]="meterDraft.medium">
          <mat-option value="Strom">Strom</mat-option>
          <mat-option value="Kaltwasser">Kaltwasser</mat-option>
          <mat-option value="Warmwasser">Warmwasser</mat-option>
          <mat-option value="Wärme">Wärme</mat-option>
          <mat-option value="Gas">Gas</mat-option>
        </mat-select>
        <mat-error *ngIf="dialogMediumField.hasError('required')">Pflichtfeld</mat-error>
      </mat-form-field>
      <mat-form-field class="mat-block">
        <mat-label>Adresse der Messstelle</mat-label>
        <input matInput name="dialogMountingAddress" [(ngModel)]="meterDraft.mountingAddress" />
      </mat-form-field>
      <mat-form-field class="mat-block">
        <mat-label>Einbauort des Zählers</mat-label>
        <input matInput name="dialogMountingLocation" [(ngModel)]="meterDraft.mountingLocation" />
      </mat-form-field>
      <mat-form-field class="mat-block">
        <mat-label>Messlokationsnummer</mat-label>
        <input matInput name="dialogMelo" [(ngModel)]="meterDraft.melo" />
      </mat-form-field>
      <mat-form-field class="mat-block">
        <mat-label>Startdatum</mat-label>
        <input matInput required [matDatepicker]="startPicker" name="dialogStartDate"
               #dialogStartDateField="ngModel" [(ngModel)]="meterDraft.startDate" />
        <mat-datepicker-toggle matSuffix [for]="startPicker"></mat-datepicker-toggle>
        <mat-datepicker #startPicker></mat-datepicker>
        <mat-error *ngIf="dialogStartDateField.hasError('required')">Pflichtfeld</mat-error>
      </mat-form-field>
      <mat-form-field class="mat-block">
        <mat-label>Enddatum (optional)</mat-label>
        <input matInput [matDatepicker]="endPicker" name="dialogEndDate" [(ngModel)]="meterDraft.endDate" />
        <mat-datepicker-toggle matSuffix [for]="endPicker"></mat-datepicker-toggle>
        <mat-datepicker #endPicker></mat-datepicker>
      </mat-form-field>
    </div>
    <div class="flex flex-row justify-end gap-2 mt-4">
      <button type="button" mat-button (click)="closeMeterDialog()">Abbrechen</button>
      <button type="button" mat-raised-button color="primary" (click)="saveMeterDialog()">Übernehmen</button>
    </div>
  </div>
</form>
{:copy-code}
```

- Put the following JavaScript code inside the "JavaScript" section:

```javascript
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
            createUserGroups();
            createUserDevices();
            createUserAccount();
            self.ctx.showSuccessToast('Gespeichert', 3000, 'top', 'center', self.ctx.$scope.toastTargetId, true);
            self.ctx.$scope.formSavedPayload = JSON.stringify(self.ctx.$scope.formData, null, 2);
            self.ctx.detectChanges();
        }, function () {
            self.ctx.$scope.formSavedPayload = 'Fehler beim Speichern der Telemetrie.';
            self.ctx.detectChanges();
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

    function createUserGroups() {
        var groupName = self.ctx.$scope.formData.lastName + ', ' + self.ctx.$scope.formData.firstName;
        saveEntityGroup({ type: 'USER', name: groupName }).subscribe(function (userGroup) {
            saveEntityGroupPermission(userGroup && userGroup.id ? userGroup.id.id : null);
        });
        saveEntityGroup({ type: 'ENTITY_VIEW', name: groupName }).subscribe();
    }

    function createUserDevices() {
        self.ctx.$scope.formData.meters.forEach(function (meter) {
            var deviceName = (meter.meterId || '').toUpperCase();
            if (!deviceName) {
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
                self.ctx.attributeService.saveEntityAttributes(entityId, 'SHARED_SCOPE', sharedAttributes).subscribe();
                self.ctx.attributeService.saveEntityAttributes(entityId, 'SERVER_SCOPE', serverAttributes).subscribe();
                linkDeviceToBtcAsset(entityId);
            });
        });
    }

    function linkDeviceToBtcAsset(deviceEntityId) {
        var btcAssetId = {
            entityType: 'ASSET',
            id: 'b2a50670-832a-11f0-81aa-a7e4f7445338'
        };
        self.ctx.entityRelationService.saveRelation({
            from: deviceEntityId,
            to: btcAssetId,
            type: 'Contains',
            typeGroup: 'COMMON'
        }).subscribe();
    }

    function saveEntityGroup(group) {
        if (self.ctx.entityGroupService && self.ctx.entityGroupService.saveEntityGroup) {
            return self.ctx.entityGroupService.saveEntityGroup(group);
        }
        return self.ctx.http.post('/api/entityGroup', group);
    }

    function saveEntityGroupPermission(userGroupId) {
        if (!userGroupId) {
            return;
        }
        var roleId = '0b0ea2b0-36e3-11f0-9416-e1bdecd1c374';
        var body = {
            entityGroupId: userGroupId,
            roleId: roleId
        };
        self.ctx.http.post('/api/entityGroup/permissions', body).subscribe();
    }

    function createUserAccount() {
        self.ctx.userService.saveUser({
            email: self.ctx.$scope.formData.email,
            authority: 'CUSTOMER_USER',
            firstName: self.ctx.$scope.formData.firstName,
            lastName: self.ctx.$scope.formData.lastName,
            customMenuId: {
                id: '7728f1d0-36e8-11f0-9416-e1bdecd1c374'
            }
        }).subscribe();
    }
};
{:copy-code}
```

- Put the following CSS code inside the "CSS" section if you want more spacing between the meter fields:

```css
.meter-row {
  display: flex;
  gap: 12px;
  align-items: center;
}

.meter-field {
  flex: 1 1 0;
}

.meter-summary-line {
  display: flex;
  flex: 1 1 auto;
  gap: 12px;
}

.meter-col {
  min-width: 120px;
}

.meter-dialog-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 1000;
}

.meter-dialog {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: min(520px, 90vw);
  max-height: 80vh;
  overflow-y: auto;
  background: #fff;
  padding: 16px;
  border-radius: 4px;
  z-index: 1001;
}
```

<br/>
<br/>
