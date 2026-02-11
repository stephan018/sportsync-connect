import eagleLogo from '@/assets/eagle-only.svg';

interface AcexLogoProps {
  size?: 'sm' | 'md' | 'lg';
  textClassName?: string;
}

const sizeMap = {
  sm: { icon: 'w-8 h-8', text: 'text-lg' },
  md: { icon: 'w-10 h-10', text: 'text-xl' },
  lg: { icon: 'w-12 h-12', text: 'text-2xl' },
};

export default function AcexLogo({ size = 'md', textClassName = '' }: AcexLogoProps) {
  const s = sizeMap[size];

  return (
    <span className="inline-flex items-center gap-2">
      <img src={eagleLogo} alt="AceX eagle" className={`${s.icon} object-contain`} />
      <span className={`font-brand font-bold uppercase tracking-wide ${s.text} ${textClassName}`}>
        AceX
      </span>
    </span>
  );
}
