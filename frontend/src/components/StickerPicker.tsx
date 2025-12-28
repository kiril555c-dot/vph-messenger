import React from 'react';
import { Sticker } from 'lucide-react';

interface StickerPickerProps {
  onStickerClick: (stickerUrl: string) => void;
}

const stickers = [
  'https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif',
  'https://media.giphy.com/media/l0HlHJGHe3yAMhdQY/giphy.gif',
  'https://media.giphy.com/media/3o6Zt481isNVuQI1l6/giphy.gif',
  'https://media.giphy.com/media/l0HlMw7Y5e5Y556yQ/giphy.gif',
];

const StickerPicker: React.FC<StickerPickerProps> = ({ onStickerClick }) => {
  return (
    <div className="absolute bottom-16 right-0 z-50 w-64 h-64 glass-panel rounded-lg p-4 overflow-y-auto">
      <div className="grid grid-cols-3 gap-2">
        {stickers.map((url, index) => (
          <img
            key={index}
            src={url}
            alt={`Sticker ${index + 1}`}
            className="w-full h-auto cursor-pointer hover:scale-110 transition-transform"
            onClick={() => onStickerClick(url)}
          />
        ))}
      </div>
    </div>
  );
};

export default StickerPicker;