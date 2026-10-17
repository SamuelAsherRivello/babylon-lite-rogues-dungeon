import { Dialog } from "./Dialog.tsx";

export function ConfirmationDialog({ title, message, confirmLabel = "Confirm", cancelLabel = "Cancel", onConfirm, onCancel }: { title: string; message: string; confirmLabel?: string; cancelLabel?: string; onConfirm(): void; onCancel(): void }) {
  return <Dialog title={title} onClose={onCancel} className="confirmation-dialog" dismissible={false} footer={<><button type="button" className="confirmation-dialog__confirm" onClick={onConfirm}>{confirmLabel}</button><button type="button" onClick={onCancel}>{cancelLabel}</button></>}><p>{message}</p></Dialog>;
}
