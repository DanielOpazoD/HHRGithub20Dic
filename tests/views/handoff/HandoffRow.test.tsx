import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HandoffRow } from '@/views/handoff/HandoffRow';
import { PatientStatus, Specialty, type PatientData } from '@/types';

describe('HandoffRow', () => {
    const basePatient: PatientData = {
        bedId: 'H1C1',
        isBlocked: false,
        bedMode: 'Cama',
        hasCompanionCrib: false,
        patientName: 'Paciente Test',
        rut: '11.111.111-1',
        age: '40',
        pathology: 'Diagnóstico prueba',
        specialty: Specialty.MEDICINA,
        status: PatientStatus.ESTABLE,
        admissionDate: '2026-01-05',
        hasWristband: true,
        devices: [],
        surgicalComplication: false,
        isUPC: false,
    };

    it('renders safely when devices is missing (legacy/incomplete data)', () => {
        const patientWithoutDevices = {
            ...basePatient,
            devices: undefined,
        } as unknown as PatientData;

        render(
            <table>
                <tbody>
                    <HandoffRow
                        bedName="H1C1"
                        bedType="MEDIA"
                        patient={patientWithoutDevices}
                        reportDate="2026-01-06"
                        noteField="handoffNoteDayShift"
                        onNoteChange={vi.fn()}
                    />
                </tbody>
            </table>
        );

        expect(screen.getByText('Paciente Test')).toBeInTheDocument();
        expect(screen.getByText('-')).toBeInTheDocument();
    });
});
