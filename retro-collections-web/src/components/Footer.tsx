declare const __BUILD_DATE__: string;
declare const __GIT_HASH__: string;

function Footer() {
  const buildDate = new Date(__BUILD_DATE__).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <footer className="border-t border-base-300 bg-base-100 py-4 text-center text-sm text-base-content/60">
      <p>
        Build: {buildDate} | Commit:{' '}
        <code className="font-mono">{__GIT_HASH__}</code>
      </p>
    </footer>
  );
}

export default Footer;
