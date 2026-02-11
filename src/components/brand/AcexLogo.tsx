import eagleLogo from '@/assets/eagle-only.svg';

interface AcexLogoProps {
  size?: 'sm' | 'md' | 'lg';
  textClassName?: string;
}

const sizeMap = {
  sm: { icon: 'w-10 h-10', text: 'text-lg' },
  md: { icon: 'w-14 h-14', text: 'text-xl' },
  lg: { icon: 'w-16 h-16', text: 'text-3xl' },
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
