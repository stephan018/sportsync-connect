import eagleLogo from '@/assets/eagle-only.svg';

interface AcexLogoProps {
  size?: 'sm' | 'md' | 'lg';
  textClassName?: string;
}

const sizeMap = {
  sm: { img: 'h-8', text: 'text-lg' },
  md: { img: 'h-10', text: 'text-xl' },
  lg: { img: 'h-12', text: 'text-3xl' },
};

export default function AcexLogo({ size = 'md', textClassName = '' }: AcexLogoProps) {
  const s = sizeMap[size];

  return (
    <span className="inline-flex items-center gap-2">
      <img src={eagleLogo} alt="AceX eagle" className={`${s.img} w-auto`} />
      <span className={`font-brand font-bold uppercase tracking-wide ${s.text} ${textClassName}`}>
        AceX
      </span>
    </span>
  );
}
