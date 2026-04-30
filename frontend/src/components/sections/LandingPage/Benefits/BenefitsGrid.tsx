import { BenefitCard } from './BenefitCard';
import { useBenefits } from '../../../../hooks/useBenefits'


export function BenefitsGrid() {

  const {benefits, loading} = useBenefits();

  if (loading){
    return <p>Carregando</p>
  }

  if (!benefits){
    return null
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {benefits.map((item, index) => (
        <BenefitCard key={item.id} item={item} index={index} />
      ))}
    </div>
  );
}