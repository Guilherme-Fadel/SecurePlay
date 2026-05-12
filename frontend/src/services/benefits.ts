import { api } from "@/services/api";

export interface Benefits{
    id: number;
    title: string;
    description: string;
    icon: string;
    color: string;
    textColor: string;
    borderColor: string;
    glow: boolean;
}

export async function getBenefits(): Promise<Benefits[]>{
    const response = await api.get('/benefits/buscar')
    return response.data
}