interface ChartDescriptionProps {
  children: string;
}

export function ChartDescription({ children }: ChartDescriptionProps) {
  return (
    <div className="sr-only" role="img" aria-label={children}>
      {children}
    </div>
  );
}
