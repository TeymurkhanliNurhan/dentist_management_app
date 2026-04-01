# Multi-Tooth Treatment Refactoring Guide

## Overview

This document describes the refactoring of the dentist management application to support multi-tooth treatments. Previously, a `ToothTreatment` could only be associated with a single tooth. Now, a single treatment can be linked to multiple teeth for the same patient.

## Architecture Changes

### 1. New Junction Table: `ToothTreatmentTeeth`

A new many-to-many junction table has been created to establish the relationship between a single `ToothTreatment` and multiple `PatientTooth` records.

**Table Structure:**
```sql
CREATE TABLE "ToothTreatmentTeeth" (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tooth_treatment_id INT NOT NULL REFERENCES "Tooth_Treatment"(id) ON DELETE CASCADE,
    patient_id INT NOT NULL,
    tooth_id INT NOT NULL,
    FOREIGN KEY (patient_id, tooth_id) REFERENCES "Patient_Teeth"(patient, tooth),
    INDEX (tooth_treatment_id),
    INDEX (patient_id, tooth_id)
);
```

### 2. Entity Changes

#### `ToothTreatment` Entity
- **New Field:** `toothTreatmentTeeth: ToothTreatmentTeeth[]` - One-to-many relationship with junction table
- **Modified Fields:**
  - `tooth: number | null` - Changed from required to optional (for backward compatibility)
  - `patientTooth: PatientTooth | null` - Changed from required to optional

#### `PatientTooth` Entity
- **New Field:** `toothTreatmentTeeth: ToothTreatmentTeeth[]` - One-to-many relationship from junction table

#### `ToothTreatmentTeeth` Entity (New)
- `id: number` - Primary key
- `toothTreatment: ToothTreatment` - Many-to-one relationship
- `patientTooth: PatientTooth` - Many-to-one relationship

### 3. Migration Strategy

Three migration files handle the schema transformation:

#### Migration 1: `1700000000005-CreateToothTreatmentTeethTable.ts`
Creates the new junction table with proper foreign keys and indices.

#### Migration 2: `1700000000006-MigrateToothTreatmentData.ts`
Migrates existing data from `Tooth_Treatment` (tooth, patient columns) to the new `ToothTreatmentTeeth` table. For each existing tooth treatment, a corresponding junction table record is created.

#### Migration 3: `1700000000007-RemovePatientToothForeignKey.ts`
Removes the composite foreign key constraint from the `Tooth_Treatment` table that linked to `Patient_Teeth`. The `tooth` and `patient` columns remain for backward compatibility but are no longer constrained by a foreign key.

## API Changes

### ToothTreatment Endpoints (Modified)

#### Create Tooth Treatment
**POST** `/tooth-treatment`

**Old Request Body:**
```json
{
  "appointment_id": 1,
  "treatment_id": 2,
  "patient_id": 3,
  "tooth_id": 11,
  "description": "Treatment description"
}
```

**New Request Body:**
```json
{
  "appointment_id": 1,
  "treatment_id": 2,
  "patient_id": 3,
  "tooth_ids": [11, 12, 13],
  "description": "Treatment description"
}
```

**Response:**
```json
{
  "id": 1,
  "patient": 3,
  "appointment": 1,
  "treatment": 2,
  "description": "Treatment description"
}
```

#### Update Tooth Treatment
**PATCH** `/tooth-treatment/:id`

**Old Request Body:**
```json
{
  "treatment_id": 2,
  "tooth_id": 12,
  "description": "Updated description"
}
```

**New Request Body:**
```json
{
  "treatment_id": 2,
  "description": "Updated description"
}
```

Note: Tooth associations are now managed via dedicated endpoints (see below).

#### Get Tooth Treatments
**GET** `/tooth-treatment`

Query parameters remain the same but the response no longer includes a `tooth` field in the treatment object. Teeth are now retrieved separately.

### New ToothTreatmentTeeth Endpoints

A new module and controller manage the many-to-many relationships.

#### Get All Tooth Treatment Teeth
**GET** `/tooth-treatment-teeth`

Query Parameters:
- `id` (optional) - Filter by relationship ID
- `tooth_treatment_id` (optional) - Filter by tooth treatment
- `tooth_id` (optional) - Filter by tooth
- `patient_id` (optional) - Filter by patient

**Response:**
```json
[
  {
    "id": 1,
    "tooth_treatment_id": 1,
    "tooth_id": 11,
    "patient_id": 3
  },
  {
    "id": 2,
    "tooth_treatment_id": 1,
    "tooth_id": 12,
    "patient_id": 3
  }
]
```

#### Get Teeth for a Specific Treatment
**GET** `/tooth-treatment-teeth/:id/teeth`

**Response:**
```json
[
  {
    "id": 1,
    "tooth_treatment_id": 1,
    "tooth_id": 11,
    "patient_id": 3
  },
  {
    "id": 2,
    "tooth_treatment_id": 1,
    "tooth_id": 12,
    "patient_id": 3
  }
]
```

#### Add Teeth to a Treatment
**POST** `/tooth-treatment-teeth`

**Request Body:**
```json
{
  "tooth_treatment_id": 1,
  "patient_id": 3,
  "tooth_ids": [11, 12, 13]
}
```

**Response:**
```json
[
  {
    "id": 1,
    "tooth_treatment_id": 1,
    "tooth_id": 11,
    "patient_id": 3
  },
  {
    "id": 2,
    "tooth_treatment_id": 1,
    "tooth_id": 12,
    "patient_id": 3
  },
  {
    "id": 3,
    "tooth_treatment_id": 1,
    "tooth_id": 13,
    "patient_id": 3
  }
]
```

#### Remove Teeth from a Treatment
**DELETE** `/tooth-treatment-teeth/:id/teeth?tooth_ids=11,12`

Query Parameters:
- `tooth_ids` - Comma-separated list of tooth IDs to remove

**Response:**
```json
{
  "message": "Teeth removed successfully"
}
```

## Backend Implementation Details

### New Files Created

1. **Entity:** `backend/src/tooth_treatment_teeth/entities/tooth_treatment_teeth.entity.ts`
2. **DTO (Create):** `backend/src/tooth_treatment_teeth/dto/create-tooth_treatment_teeth.dto.ts`
3. **DTO (Get):** `backend/src/tooth_treatment_teeth/dto/get-tooth_treatment_teeth.dto.ts`
4. **Repository:** `backend/src/tooth_treatment_teeth/tooth_treatment_teeth.repository.ts`
5. **Service:** `backend/src/tooth_treatment_teeth/tooth_treatment_teeth.service.ts`
6. **Controller:** `backend/src/tooth_treatment_teeth/tooth_treatment_teeth.controller.ts`
7. **Module:** `backend/src/tooth_treatment_teeth/tooth_treatment_teeth.module.ts`
8. **Migrations:** 
   - `backend/src/migrations/1700000000005-CreateToothTreatmentTeethTable.ts`
   - `backend/src/migrations/1700000000006-MigrateToothTreatmentData.ts`
   - `backend/src/migrations/1700000000007-RemovePatientToothForeignKey.ts`

### Modified Files

1. **Entity:** `backend/src/tooth_treatment/entities/tooth_treatment.entity.ts`
   - Added `toothTreatmentTeeth` relationship
   - Made `tooth` and `patientTooth` nullable

2. **Entity:** `backend/src/patient_tooth/entities/patient_tooth.entity.ts`
   - Added `toothTreatmentTeeth` relationship

3. **DTO:** `backend/src/tooth_treatment/dto/create-tooth_treatment.dto.ts`
   - Changed `tooth_id: number` to `tooth_ids: number[]`

4. **DTO:** `backend/src/tooth_treatment/dto/update-tooth_treatment.dto.ts`
   - Removed `tooth_id` field (now managed via separate endpoints)
   - Kept optional `tooth_ids` for future flexibility

5. **Repository:** `backend/src/tooth_treatment/tooth_treatment.repository.ts`
   - Updated `createForDentist()` to accept `toothIds` array
   - Updated `updateEnsureOwnership()` to remove tooth update logic

6. **Service:** `backend/src/tooth_treatment/tooth_treatment.service.ts`
   - Updated `create()` and `patch()` methods
   - Updated `findAll()` to remove tooth from response

7. **Config:** `backend/data-source.ts`
   - Added `ToothTreatmentTeeth` to entity list

8. **Config:** `backend/src/app.module.ts`
   - Imported `ToothTreatmentTeethModule`
   - Added `ToothTreatmentTeeth` to entities list in TypeORM configuration

## Data Migration Example

**Before:**
```
Tooth_Treatment table:
id | appointment | treatment | patient | tooth | description
1  | 10          | 5         | 3       | 11    | "Fill cavity"
2  | 10          | 6         | 3       | 12    | "Extract"
```

**After:**
```
Tooth_Treatment table:
id | appointment | treatment | patient | tooth | description
1  | 10          | 5         | 3       | NULL  | "Fill cavity"
2  | 10          | 6         | 3       | NULL  | "Extract"

ToothTreatmentTeeth table:
id | tooth_treatment_id | patient_id | tooth_id
1  | 1                  | 3          | 11
2  | 2                  | 3          | 12
```

## Running Migrations

To apply the migrations, run:

```bash
npm run migration:run
# or
typeorm migration:run -d ./data-source.ts
```

To roll back migrations, run:

```bash
npm run migration:revert
# or
typeorm migration:revert -d ./data-source.ts
```

## API Usage Examples

### Create a treatment for multiple teeth

```bash
curl -X POST http://localhost:3000/tooth-treatment \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "appointment_id": 1,
    "treatment_id": 2,
    "patient_id": 3,
    "tooth_ids": [11, 12, 13],
    "description": "Multiple cavity fillings"
  }'
```

### Add more teeth to an existing treatment

```bash
curl -X POST http://localhost:3000/tooth-treatment-teeth \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "tooth_treatment_id": 1,
    "patient_id": 3,
    "tooth_ids": [14, 15]
  }'
```

### Get all teeth for a treatment

```bash
curl -X GET http://localhost:3000/tooth-treatment-teeth/1/teeth \
  -H "Authorization: Bearer {token}"
```

### Remove specific teeth from a treatment

```bash
curl -X DELETE "http://localhost:3000/tooth-treatment-teeth/1/teeth?tooth_ids=14,15" \
  -H "Authorization: Bearer {token}"
```

## Backward Compatibility Notes

- The `tooth` and `patient` columns remain in the `Tooth_Treatment` table for backward compatibility but are no longer constrained by foreign keys
- Old API clients will need to update their code to use the new `tooth_ids` array
- The GET endpoint for tooth treatments no longer includes `tooth` in the response
- All existing data has been automatically migrated to the new structure

## Testing Recommendations

1. **Unit Tests:** Update ToothTreatment service tests to work with the new array-based API
2. **Integration Tests:** Test creating treatments with multiple teeth and verify junction table records
3. **Data Integrity Tests:** Verify that cascade deletes work properly when a treatment is deleted
4. **Migration Tests:** Verify that existing data is correctly migrated without loss
5. **API Tests:** Test all new CRUD endpoints for the junction table

## Troubleshooting

### Issue: Cascade delete not working
**Solution:** Ensure the migration has been fully applied and the foreign key constraint includes `ON DELETE CASCADE`.

### Issue: Duplicate teeth in a treatment
**Solution:** Check the application logic to prevent duplicate `tooth_id` entries in the request.

### Issue: Permission errors when accessing teeth
**Solution:** Ensure the dentist ownership check includes the appointment-to-dentist relationship chain through the `ToothTreatment` record.
