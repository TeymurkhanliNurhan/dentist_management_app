-- Migration script to copy tooth data from Tooth_Treatment to ToothTreatmentTeeth
-- Based on the table schema, ToothTreatmentTeeth requires tooth_treatment_id, patient_id, tooth_id

-- 1. Insert data
INSERT INTO ToothTreatmentTeeth (tooth_treatment_id, patient_id, tooth_id)
SELECT id, patient, tooth FROM Tooth_Treatment
WHERE tooth IS NOT NULL;

-- 2. Verify the data is copied correctly
-- Check the count of inserted records
SELECT COUNT(*) AS inserted_records FROM ToothTreatmentTeeth;

-- Check the count of source records
SELECT COUNT(*) AS source_records FROM Tooth_Treatment WHERE tooth IS NOT NULL;

-- Optionally, verify a few records
SELECT ttt.tooth_treatment_id, ttt.patient_id, ttt.tooth_id, tt.patient, tt.tooth
FROM ToothTreatmentTeeth ttt
JOIN Tooth_Treatment tt ON ttt.tooth_treatment_id = tt.id
LIMIT 10;

-- The 'tooth' column in 'Tooth_Treatment' is kept as backup until UI confirmation.