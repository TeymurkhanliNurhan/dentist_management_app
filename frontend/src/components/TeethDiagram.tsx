import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PatientTooth, ToothTreatment } from '../services/api';
import { toothTreatmentService, toothTreatmentTeethService } from '../services/api';
import { useTranslation } from 'react-i18next';

interface TeethDiagramProps {
  patientId: number;
  patientTeeth: PatientTooth[];
  toothTreatments?: ToothTreatment[];
}

const TeethDiagram = ({ patientId, patientTeeth, toothTreatments = [] }: TeethDiagramProps) => {
  const navigate = useNavigate();
  const [isPermanent, setIsPermanent] = useState(true);
  const [hoveredTooth, setHoveredTooth] = useState<number | null>(null);
  const [hoverHistory, setHoverHistory] = useState<ToothTreatment[]>([]);
  const [isHoverLoading, setIsHoverLoading] = useState(false);
  const [hoverError, setHoverError] = useState<string | null>(null);
  const { t } = useTranslation('teethDiagram');

  const hasToothNumber = (toothNumber: number) => {
    return patientTeeth.some(pt => pt.toothNumber === toothNumber);
  };

  const getToothIdByNumber = (toothNumber: number): number | null => {
    const pt = patientTeeth.find(pt => pt.toothNumber === toothNumber);
    return pt ? pt.tooth : null;
  };

  const getTreatmentsForTooth = (toothNumber: number) => {
    if (hoverHistory.length > 0 && hoveredTooth === toothNumber) {
      console.debug('Using hoverHistory for tooth', toothNumber, hoverHistory);
      return hoverHistory;
    }

    const toothId = getToothIdByNumber(toothNumber);
    if (!toothId) return [];

    const mapped = toothTreatments
      .filter((tt) => {
        const hasNewRelation = tt.toothTreatmentTeeth?.some((ttt) => ttt.toothId === toothId);
        const hasLegacyTooth = tt.tooth === toothId;
        return hasNewRelation || hasLegacyTooth;
      })
      .reduce((acc: ToothTreatment[], tt) => {
        if (!acc.some((x) => x.id === tt.id)) acc.push(tt);
        return acc;
      }, []);

    return mapped.sort((a, b) => new Date(b.appointment.startDate).getTime() - new Date(a.appointment.startDate).getTime());
  };

  const loadToothHistory = async (toothNumber: number) => {
    const toothId = getToothIdByNumber(toothNumber);
    if (!toothId) {
      setHoverHistory([]);
      return;
    }

    setIsHoverLoading(true);
    setHoverError(null);
    console.debug('Fetching tooth history for patient', patientId, 'tooth', toothId);

    try {
      const tttRecords = await toothTreatmentTeethService.getAll({ patient_id: patientId, tooth_id: toothId });
      console.debug('toothTreatmentTeeth response', tttRecords);

      if (!tttRecords.length) {
        setHoverHistory([]);
        return;
      }

      const treatmentIds = Array.from(new Set(tttRecords.map((record) => record.tooth_treatment_id)));
      const historyEntries: ToothTreatment[] = [];
      for (const id of treatmentIds) {
        const response = await toothTreatmentService.getAll({ id });
        console.debug('toothTreatment fetch for id', id, '=>', response);

        if (response.length > 0) {
          historyEntries.push(response[0]);
        }
      }

      setHoverHistory(historyEntries.sort((a, b) => new Date(b.appointment.startDate).getTime() - new Date(a.appointment.startDate).getTime()));
    } catch (error: any) {
      console.error('Failed loading tooth history', error);
      setHoverError(error.message || 'Unknown error');
      setHoverHistory([]);
    } finally {
      setIsHoverLoading(false);
    }
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
        onMouseEnter={() => {
          if (!hasTooth) return;
          setHoveredTooth(number);
          loadToothHistory(number);
        }}
        onMouseLeave={() => setHoveredTooth(prev => (prev === number ? null : prev))}
        onClick={() => handleToothClick(number)}
        className={`absolute w-8 h-8 flex items-center justify-center text-xs font-bold transition-all ${
          hasTooth 
            ? 'text-black cursor-pointer hover:text-[#0066A6] hover:scale-110'
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
    <div className="w-full max-w-2xl mx-auto rounded-2xl bg-transparent p-0 sm:p-1">
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setIsPermanent(!isPermanent)}
          className="rounded-lg bg-[#0066A6] px-4 py-2 font-medium text-white shadow-sm transition-colors hover:bg-[#00588f]"
        >
          {isPermanent ? t('childTeeth') : t('permanentTeeth')}
        </button>
      </div>
      
      <div 
        className="relative w-full" 
        style={{ paddingBottom: '90%' }}
        onMouseLeave={() => setHoveredTooth(null)}
      >
        <img
          src={isPermanent ? "/images/32teeth_logo.jpg" : "/images/20teeth_logo.jpg"}
          alt="Teeth Diagram"
          className="absolute top-0 left-0 w-full h-full object-contain"
        />

        {hoveredTooth !== null && (
          <div 
            className="absolute right-2 top-2 z-20 w-72 rounded-lg border border-slate-200 bg-white p-3 shadow-lg backdrop-blur-sm"
            onMouseEnter={() => setHoveredTooth(hoveredTooth)}
            onMouseLeave={() => setHoveredTooth(null)}
          >
            <h3 className="mb-2 text-sm font-semibold text-[#0066A6]">Tooth #{hoveredTooth} history</h3>
            {isHoverLoading ? (
              <p className="text-xs text-gray-500">Loading history...</p>
            ) : hoverError ? (
              <p className="text-xs text-red-500">Error: {hoverError}</p>
            ) : getTreatmentsForTooth(hoveredTooth).length === 0 ? (
              <p className="text-xs text-gray-500">No previous treatments</p>
            ) : (
              <ul className="space-y-2 max-h-56 overflow-y-auto">
                {getTreatmentsForTooth(hoveredTooth).map((t) => (
                  <li key={t.id} className="rounded-md border border-slate-100 bg-slate-50 p-2">
                    <p className="text-[11px] text-gray-500">Appointment: <span className="text-gray-700 font-medium">{new Date(t.appointment.startDate).toLocaleDateString()}</span></p>
                    <p className="text-[11px] text-gray-500">Treatment: <span className="text-gray-800 font-semibold">{t.treatment.name}</span></p>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-[10px] text-gray-400"></p>
          </div>
        )}

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

