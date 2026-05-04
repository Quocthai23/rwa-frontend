interface StepItemProps {
  description: string;
  isLast?: boolean;
  step: number;
  title: string;
}

export const StepItem = ({ description, isLast, step, title }: StepItemProps) => {
  return (
    <div className={`flex items-start ${!isLast ? 'mb-6' : ''}`}>
      <div className="flex items-start">
        <div className="relative mr-3 flex flex-col items-center">
          <div className="dark:bg-primary-500 bg-primary-50 relative z-10 flex h-9 w-9 items-center justify-center rounded-full">
            <span className="text-body-semibold text-primary-500 text-lg dark:text-neutral-100">
              {step}
            </span>
          </div>
          {!isLast && <div className="bg-border absolute top-8 h-[140%] w-px" />}
        </div>

        <div className="flex-1">
          <p className="text-body-large-semibold text-foreground">{title}</p>
          <p className="text-body-small-regular text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
    </div>
  );
};
