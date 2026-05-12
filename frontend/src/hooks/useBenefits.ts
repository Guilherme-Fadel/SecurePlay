import { useState, useEffect } from 'react';
import { Benefits, getBenefits } from '@/services/benefits';

export function useBenefits(){
    const [benefits, setBenefits] = useState<Benefits[] | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getBenefits()
            .then(setBenefits)
            .finally(() => setLoading(false));
    }, [])

    return {benefits, loading}
}