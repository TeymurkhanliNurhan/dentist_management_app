import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PatientTooth } from '../services/api';
import { useTranslation } from 'react-i18next';

interface TeethDiagramProps {
  patientId: number;
  patientTeeth: PatientTooth[];
}

const TeethDiagram = ({ patientId, patientTeeth }: TeethDiagramProps) => {
  const navigate = useNavigate();
  const [isPermanent, setIsPermanent] = useState(true);
  const { t } = useTranslation('teethDiagram');

  const hasToothNumber = (toothNumber: number) => {
    return patientTeeth.some(pt => pt.toothNumber === toothNumber);
  };

  const handleToothClick = (toothNumber: number) => {
    if (hasToothNumber(toothNumber)) {
      const tooth = patientTeeth.find(pt => pt.toothNumber === toothNumber);
      if (tooth) {
        navigate(`/patients/${patientId}/teeth/${tooth.tooth}`);
      }
    }
  };

  const ToothNumber = ({ 
    number, 
    top, 
    left 
  }: { 
    number: number; 
    top: string; 
    left: string;
  }) => {
    const hasTooth = hasToothNumber(number);
    
    return (
      <div
        onClick={() => handleToothClick(number)}
        className={`absolute w-8 h-8 flex items-center justify-center text-xs font-bold transition-all ${
          hasTooth 
            ? 'text-black cursor-pointer hover:text-teal-600 hover:scale-110'
            : 'text-gray-300 cursor-not-allowed opacity-50'
        }`}
        style={{ top, left }}
        title={hasTooth ? t('tooltipAvailable', { number }) : t('tooltipUnavailable', { number })}
      >
        {number}
      </div>
    );
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl p-4 shadow-lg">
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setIsPermanent(!isPermanent)}
          className="px-4 py-2 bg-teal-500 text-white rounded-lg font-medium hover:bg-teal-600 transition-colors shadow-md"
        >
          {isPermanent ? t('childTeeth') : t('permanentTeeth')}
        </button>
      </div>
      
      <div className="relative w-full" style={{ paddingBottom: '90%' }}>
        <img
          src={isPermanent ? "/images/32teeth_logo.jpg" : "/images/20teeth_logo.jpg"}
          alt="Teeth Diagram"
          className="absolute top-0 left-0 w-full h-full object-contain"
        />
        
        {isPermanent ? (
          <>
            {/* Permanent Teeth - Upper Right (18-11) */}
            <ToothNumber number={18} top="39%" left="32.5%" />
            <ToothNumber number={17} top="31%" left="31.5%" />
            <ToothNumber number={16} top="24%" left="32%" />
            <ToothNumber number={15} top="18%" left="32.8%" />
            <ToothNumber number={14} top="12.5%" left="34.2%" />
            <ToothNumber number={13} top="8%" left="36%" />
            <ToothNumber number={12} top="5%" left="39.7%" />
            <ToothNumber number={11} top="3%" left="44.5%" />

            {/* Permanent Teeth - Upper Left (21-28) */}
            <ToothNumber number={21} top="3%" left="50%" />
            <ToothNumber number={22} top="5%" left="55%" />
            <ToothNumber number={23} top="8%" left="59%" />
            <ToothNumber number={24} top="12.5%" left="60%" />
            <ToothNumber number={25} top="18.3%" left="61.7%" />
            <ToothNumber number={26} top="24.5%" left="62.6%" />
            <ToothNumber number={27} top="31%" left="63.2%" />
            <ToothNumber number={28} top="39%" left="62.3%" />

            {/* Permanent Teeth - Lower Right (48-41) */}
            <ToothNumber number={48} top="55%" left="32.9%" />
            <ToothNumber number={47} top="63%" left="31.8%" />
            <ToothNumber number={46} top="70%" left="32.3%" />
            <ToothNumber number={45} top="76%" left="33.2%" />
            <ToothNumber number={44} top="82%" left="34.8%" />
            <ToothNumber number={43} top="86.3%" left="36.9%" />
            <ToothNumber number={42} top="89.7%" left="40.1%" />
            <ToothNumber number={41} top="91%" left="45%" />

            {/* Permanent Teeth - Lower Left (31-38) */}
            <ToothNumber number={31} top="91%" left="50.5%" />
            <ToothNumber number={32} top="89.7%" left="55.5%" />
            <ToothNumber number={33} top="86.3%" left="59%" />
            <ToothNumber number={34} top="82%" left="61%" />
            <ToothNumber number={35} top="76%" left="62.3%" />
            <ToothNumber number={36} top="70%" left="63.4%" />
            <ToothNumber number={37} top="63%" left="63.8%" />
            <ToothNumber number={38} top="55%" left="62.8%" />
          </>
        ) : (
          <>
            {/* Childish Teeth - Upper Right (55-51) */}
            <ToothNumber number={55} top="34%" left="28.4%" />
            <ToothNumber number={54} top="23.5%" left="30.2%" />
            <ToothNumber number={53} top="15%" left="33.5%" />
            <ToothNumber number={52} top="10%" left="38%" />
            <ToothNumber number={51} top="7.5%" left="44%" />

            {/* Childish Teeth - Upper Left (61-65) */}
            <ToothNumber number={61} top="7.5%" left="51%" />
            <ToothNumber number={62} top="10%" left="57.5%" />
            <ToothNumber number={63} top="15%" left="62.5%" />
            <ToothNumber number={64} top="23.3%" left="66.5%" />
            <ToothNumber number={65} top="33.8%" left="68.5%" />

            {/* Childish Teeth - Lower Right (85-81) */}
            <ToothNumber number={85} top="61.2%" left="28.7%" />
            <ToothNumber number={84} top="71.5%" left="30.6%" />
            <ToothNumber number={83} top="79.7%" left="33.8%" />
            <ToothNumber number={82} top="85%" left="38.1%" />
            <ToothNumber number={81} top="87.7%" left="44.4%" />

            {/* Childish Teeth - Lower Left (71-75) */}
            <ToothNumber number={71} top="87.7%" left="51.2%" />
            <ToothNumber number={72} top="85%" left="57.9%" />
            <ToothNumber number={73} top="79.7%" left="62.9%" />
            <ToothNumber number={74} top="71.5%" left="66.9%" />
            <ToothNumber number={75} top="61.2%" left="68.6%" />
          </>
        )}
      </div>

      <div className="mt-3 text-center text-sm text-gray-600">
        <p className="font-medium">{t('instruction')}</p>
      </div>
    </div>
  );
};

export default TeethDiagram;

