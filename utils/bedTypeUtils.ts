import { BedDefinition, BedType, DailyRecord } from '../types';

export const getBedTypeForRecord = (bed: BedDefinition, record?: DailyRecord | null): BedType => {
    if (record?.bedTypeOverrides?.[bed.id]) {
        return record.bedTypeOverrides[bed.id];
    }

    return bed.type;
};

export const isIntensiveBedType = (bedType: BedType): boolean => (
    bedType === BedType.UTI || bedType === BedType.UCI
);
