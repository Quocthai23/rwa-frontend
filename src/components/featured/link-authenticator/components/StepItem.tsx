type StepItemProps = {
  step: string;
  text: string;
};

export default function StepItem({ step, text }: StepItemProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="bg-primary-100 dark:bg-primary-900/25 flex size-8 shrink-0 items-center justify-center rounded-full">
        <p className="text-body-large-semibold text-primary-500">{step}</p>
      </div>
      <div>
        <p className="text-body-large-medium text-foreground">{text}</p>
      </div>
    </div>
  );
}
