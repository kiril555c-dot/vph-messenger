import React from 'react';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import type { EmojiClickData } from 'emoji-picker-react';

interface EmojiPickerProps {
  onEmojiClick: (emojiData: EmojiClickData) => void;
}

const CustomEmojiPicker: React.FC<EmojiPickerProps> = ({ onEmojiClick }) => {
  return (
    <div className="absolute bottom-16 right-0 z-50">
      <EmojiPicker
        onEmojiClick={onEmojiClick}
        theme={Theme.DARK}
        searchDisabled
        skinTonesDisabled
        previewConfig={{ showPreview: false }}
        height={350}
        width={300}
      />
    </div>
  );
};

export default CustomEmojiPicker;