import { ReactElement, cloneElement, useId } from "react";
import "./styles.scss";

interface FormFieldProps {
  label: string;
  children: ReactElement<{ id?: string }>;
}

export default function FormField({ label, children }: FormFieldProps) {
  const generatedId = useId();
  const id = children.props.id ?? generatedId;

  return (
    <div className="form_field">
      <label htmlFor={id}>{label}</label>
      {cloneElement(children, { id })}
    </div>
  );
}
