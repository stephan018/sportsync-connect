import eagleLogo from '@/assets/eagle-only.svg';

interface AcexLogoProps {
  size?: 'sm' | 'md' | 'lg';
  textClassName?: string;
}

const sizeMap = {
  sm: { wrapper: 'h-7 w-12', img: 'h-[3.5rem] w-auto', text: 'text-lg' },
  md: { wrapper: 'h-9 w-14', img: 'h-[4.5rem] w-auto', text: 'text-xl' },
  lg: { wrapper: 'h-11 w-16', img: 'h-[5.5rem] w-auto', text: 'text-3xl' },
};

export default function AcexLogo({ size = 'md', textClassName = '' }: AcexLogoProps) {
  const s = sizeMap[size];

  return (
    <span className="inline-flex items-center gap-1">
      <span className={`${s.wrapper} flex items-center justify-center overflow-visible shrink-0`}>
        <img src={eagleLogo} alt="AceX eagle" className={`${s.img} max-w-none`} />
      </span>
      <span className={`font-brand font-bold uppercase tracking-wide ${s.text} ${textClassName}`}>
        AceX
      </span>
    </span>
  );
}
