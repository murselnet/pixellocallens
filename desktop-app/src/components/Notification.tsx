import { useEffect } from 'react';
import { Notification as NotificationType } from '../types';

interface Props {
  notification: NotificationType;
  onClose: (id: number) => void;
}

const Notification = ({ notification, onClose }: Props) => {
  useEffect(() => {
    const timer = window.setTimeout(() => onClose(notification.id), 4200);
    return () => window.clearTimeout(timer);
  }, [notification.id, onClose]);

  return (
    <div className={`toast toast--${notification.type}`}>
      <div className="toast__body">
        <strong>{notification.type === 'success' ? 'Tamam' : notification.type === 'error' ? 'Hata' : 'Bilgi'}</strong>
        <span>{notification.message}</span>
      </div>
      <button className="icon-button icon-button--ghost" onClick={() => onClose(notification.id)}>
        x
      </button>
    </div>
  );
};

export default Notification;
