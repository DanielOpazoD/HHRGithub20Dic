import { describe, it, expect } from 'vitest';
import { mapToFhirPatient, mapToFhirEncounter, mapRecordToFhirBundle } from '../../../services/integrations/fhir/FhirMappingService';
import { PatientData, Specialty, PatientStatus, BedType, DailyRecord } from '../../../types';

describe('FhirMappingService', () => {
    const mockPatient: PatientData = {
        bedId: 'bed-1',
        isBlocked: false,
        bedMode: 'Cama',
        hasCompanionCrib: false,
        patientName: 'JUAN PEREZ SOTO',
        rut: '12.345.678-9',
        documentType: 'RUT',
        age: '45',
        biologicalSex: 'Masculino',
        pathology: 'Neumonía',
        specialty: Specialty.MEDICINA,
        status: PatientStatus.ESTABLE,
        admissionDate: '2023-12-01',
        hasWristband: true,
        devices: [],
        surgicalComplication: false,
        isUPC: false
    };

    it('should map a patient to FHIR Patient resource', () => {
        const fhirPatient = mapToFhirPatient(mockPatient);

        expect(fhirPatient.resourceType).toBe('Patient');
        expect(fhirPatient.identifier[0].value).toBe('12.345.678-9');
        expect(fhirPatient.identifier[0].system).toBe('https://registrocivil.cl/rut');
        expect(fhirPatient.name[0].text).toBe('JUAN PEREZ SOTO');
        expect(fhirPatient.gender).toBe('male');
    });

    it('should map specific name fields (family and given)', () => {
        const fhirPatient = mapToFhirPatient(mockPatient);
        expect(fhirPatient.name[0].family).toBe('SOTO');
        expect(fhirPatient.name[0].given).toContain('JUAN');
        expect(fhirPatient.name[0].given).toContain('PEREZ');
    });

    it('should map patient to FHIR Encounter resource', () => {
        const fhirEncounter = mapToFhirEncounter(mockPatient, '2023-12-28', 'p-123456789');

        expect(fhirEncounter.resourceType).toBe('Encounter');
        expect(fhirEncounter.status).toBe('in-progress');
        expect(fhirEncounter.class.code).toBe('IMP');
        expect(fhirEncounter.subject.reference).toBe('Patient/p-123456789');
        expect(fhirEncounter.reasonCode?.[0].text).toBe('Neumonía');
    });

    it('should create a FHIR Bundle from a DailyRecord', () => {
        const mockRecord: DailyRecord = {
            date: '2023-12-28',
            beds: { 'bed-1': mockPatient },
            discharges: [],
            transfers: [],
            cma: [],
            lastUpdated: new Date().toISOString(),
            nurses: [],
            activeExtraBeds: []
        };

        const bundle = mapRecordToFhirBundle(mockRecord);
        expect(bundle.resourceType).toBe('Bundle');
        expect(bundle.type).toBe('transaction');
        // 2 entries expected per patient (Patient + Encounter)
        expect(bundle.entry.length).toBe(2);
        expect(bundle.entry[0].resource.resourceType).toBe('Patient');
        expect(bundle.entry[1].resource.resourceType).toBe('Encounter');
    });
});
