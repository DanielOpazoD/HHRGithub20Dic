export const formatEvacuationMethod = (method: string, other?: string): string => {
    if (method !== 'Otro') {
        return method;
    }

    const detail = other?.trim();
    if (!detail) {
        return method;
    }

    return `Otro: ${detail}`;
};
