import { useVetStore } from '@/store/VetStore';

export default function Toast() {
  const { toast } = useVetStore();
  if (!toast) return null;
  return (
    <div className="toast-wrap" role="status">
      <div className="toast">{toast}</div>
    </div>
  );
}
