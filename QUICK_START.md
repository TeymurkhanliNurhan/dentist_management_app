# Quick Start Guide - Multi-Tooth Treatments

## Before You Start

Make sure you have:
- Docker containers running (or will run them manually)
- Database backup created
- Access to the git repository

## Step 1: Review the Changes

```bash
# Review what was changed
cat IMPLEMENTATION_SUMMARY.md
cat REFACTORING_GUIDE.md
cat MIGRATION_NOTES.md
```

## Step 2: Run Migrations

```bash
cd backend

# Option A: Using npm script (if configured)
npm run migration:run

# Option B: Using TypeORM CLI directly
npx typeorm migration:run -d ./data-source.ts
```

### What the migrations do:
1. **Migration 1700000000005**: Creates `ToothTreatmentTeeth` junction table
2. **Migration 1700000000006**: Moves existing treatment-tooth links to new table
3. **Migration 1700000000007**: Removes old foreign key constraint

### Verify migrations succeeded:
```bash
# List all migrations
npx typeorm migration:show -d ./data-source.ts

# You should see all three new migrations in the "executed" section
```

## Step 3: Test the API

### Using cURL

#### 1. Create a treatment with multiple teeth
```bash
curl -X POST http://localhost:3000/tooth-treatment \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "appointment_id": 1,
    "treatment_id": 2,
    "patient_id": 3,
    "tooth_ids": [11, 12, 13],
    "description": "Multi-tooth treatment"
  }'
```

Expected response:
```json
{
  "id": 1,
  "patient": 3,
  "appointment": 2,
  "treatment": 2,
  "description": "Multi-tooth treatment"
}
```

#### 2. View teeth linked to a treatment
```bash
curl -X GET http://localhost:3000/tooth-treatment-teeth/1/teeth \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Expected response:
```json
[
  { "id": 1, "tooth_treatment_id": 1, "tooth_id": 11, "patient_id": 3 },
  { "id": 2, "tooth_treatment_id": 1, "tooth_id": 12, "patient_id": 3 },
  { "id": 3, "tooth_treatment_id": 1, "tooth_id": 13, "patient_id": 3 }
]
```

#### 3. Add more teeth to the treatment
```bash
curl -X POST http://localhost:3000/tooth-treatment-teeth \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tooth_treatment_id": 1,
    "patient_id": 3,
    "tooth_ids": [14, 15]
  }'
```

#### 4. Remove teeth from the treatment
```bash
curl -X DELETE "http://localhost:3000/tooth-treatment-teeth/1/teeth?tooth_ids=14,15" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Step 4: Update Frontend (If Applicable)

### Old way:
```typescript
const response = await api.post('/tooth-treatment', {
  appointment_id: 1,
  treatment_id: 2,
  patient_id: 3,
  tooth_id: 11  // Single tooth
});
```

### New way:
```typescript
const response = await api.post('/tooth-treatment', {
  appointment_id: 1,
  treatment_id: 2,
  patient_id: 3,
  tooth_ids: [11, 12, 13]  // Multiple teeth
});
```

### To manage teeth after creation:
```typescript
// Get teeth for a treatment
const teeth = await api.get(`/tooth-treatment-teeth/${treatmentId}/teeth`);

// Add teeth
await api.post('/tooth-treatment-teeth', {
  tooth_treatment_id: treatmentId,
  patient_id: patientId,
  tooth_ids: [14, 15]
});

// Remove teeth
await api.delete(`/tooth-treatment-teeth/${treatmentId}/teeth?tooth_ids=14,15`);
```

## Step 5: Run Tests

```bash
cd backend

# Run unit tests
npm test

# Run specific test file
npm test tooth_treatment.service

# Watch mode
npm run test:watch
```

## Troubleshooting

### Migration failed?
```bash
# Check what went wrong
npx typeorm migration:show -d ./data-source.ts

# Rollback the last migration
npx typeorm migration:revert -d ./data-source.ts

# Check database logs
```

### Getting 403 Forbidden?
- Verify your JWT token is valid
- Ensure dentist owns the appointment for this treatment
- Check that the appointment belongs to a patient you treat

### Getting "PatientTooth not found"?
- Verify the patient-tooth combination exists in the system
- Check patient ID matches the treatment's patient
- Ensure tooth ID is valid (1-52)

### Port already in use?
```bash
# Find and kill the process
lsof -i :3000
kill -9 <PID>

# Or use a different port
PORT=3001 npm start
```

## Key API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/tooth-treatment` | **Create treatment (now with tooth_ids array)** |
| GET | `/tooth-treatment` | Get all treatments |
| PATCH | `/tooth-treatment/:id` | Update treatment (tooth_id removed) |
| DELETE | `/tooth-treatment/:id` | Delete treatment |
| **GET** | **`/tooth-treatment-teeth`** | **Get all tooth relationships** |
| **GET** | **`/tooth-treatment-teeth/:id/teeth`** | **Get teeth for treatment** |
| **POST** | **`/tooth-treatment-teeth`** | **Add teeth to treatment** |
| **DELETE** | **`/tooth-treatment-teeth/:id/teeth`** | **Remove teeth from treatment** |

**Bold** = New endpoints

## Files to Review

### For API Documentation
- `REFACTORING_GUIDE.md` - Complete API reference with examples

### For Migration Details
- `MIGRATION_NOTES.md` - Migration execution steps

### For Implementation Details
- `IMPLEMENTATION_SUMMARY.md` - Overview of all changes
- `backend/src/tooth_treatment_teeth/` - New module code

## Database Tables

### New Table: ToothTreatmentTeeth
```
Columns:
- id (INT, Primary Key)
- tooth_treatment_id (INT, Foreign Key → Tooth_Treatment)
- patient_id (INT, part of Foreign Key → Patient_Teeth)
- tooth_id (INT, part of Foreign Key → Patient_Teeth)

Indices:
- (tooth_treatment_id)
- (patient_id, tooth_id)
```

### Modified Table: Tooth_Treatment
```
Changes:
- tooth column: now nullable (was NOT NULL)
- Removed FK constraint to Patient_Teeth
  (now relationships via ToothTreatmentTeeth)
```

## Common Tasks

### View all treatments for a patient
```bash
curl -X GET "http://localhost:3000/tooth-treatment?patient=3" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### View all teeth treated in an appointment
```bash
curl -X GET "http://localhost:3000/tooth-treatment-teeth?tooth_treatment_id=1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Find treatments for a specific tooth
```bash
curl -X GET "http://localhost:3000/tooth-treatment-teeth?tooth_id=11" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Support

### For detailed API documentation
→ See `REFACTORING_GUIDE.md`

### For migration issues
→ See `MIGRATION_NOTES.md` Troubleshooting section

### For code implementation
→ See `IMPLEMENTATION_SUMMARY.md` or explore `backend/src/tooth_treatment_teeth/`

## What's Next?

1. ✅ Run migrations
2. ✅ Test API endpoints
3. ✅ Update frontend code
4. ✅ Run full test suite
5. ✅ Deploy to staging
6. ✅ Perform end-to-end testing
7. ✅ Deploy to production
8. ✅ Monitor for errors

Happy coding! 🚀
