import { notFound } from 'next/navigation';
import LiveMarriageWorkspace from '@/components/marriages/LiveMarriageWorkspace';
export const metadata={title:'Marriage & Counselling',robots:{index:false,follow:false}};
export const dynamic='force-dynamic';
export default function MarriagesPage(){
 if(process.env.HBG_MARRIAGES_ENABLED!=='true')notFound();
 return <LiveMarriageWorkspace/>;
}
