// Simple toast implementation
// TODO: Replace with a proper toast library like sonner or react-hot-toast

interface ToastOptions {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

export function useToast() {
  const toast = ({ title, description, variant }: ToastOptions) => {
    const message = description ? `${title}: ${description}` : title;
    
    if (variant === 'destructive') {
      console.error(message);
      alert(message);
    } else {
      console.log(message);
      // In a real implementation, this would trigger a toast notification
      // For now, we'll just log to console
    }
  };

  return { toast };
}

