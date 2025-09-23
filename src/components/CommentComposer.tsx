import React from 'react';

type Props = {
  onSubmit: (body: string) => Promise<void> | void;
};

export default function CommentComposer({ onSubmit }: Props) {
  const [val, setVal] = React.useState('');
  const [pending, setPending] = React.useState(false);

  const send = async () => {
    if (!val.trim()) return;
    setPending(true);
    try {
      await onSubmit(val.trim());
      setVal('');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex gap-2">
      <input
        className="flex-1 rounded border border-app bg-surface-2 px-2 py-1"
        placeholder="Write a comment… Use @name to mention"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') send();
        }}
      />
      <button className="px-3 py-1 rounded bg-accent text-white disabled:opacity-50" disabled={pending} onClick={send}>
        Send
      </button>
    </div>
  );
}
