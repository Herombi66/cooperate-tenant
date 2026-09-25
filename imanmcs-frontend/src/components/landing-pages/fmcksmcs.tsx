import React, { useMemo } from 'react';
import rawHtml from './fmcksmcs.html?raw';
import fmckImg from '../../Assets/fmck.jpeg';
import logoImg from '../../Assets/logo.png';

/**
 * Custom Landing Page for FMC Kumo Staff MPCS Ltd (fmcksmcs)
 * Tenant ID: fmcksmcs
 */
export default function FMCKsmcsLandingPage() {
  const htmlContent = useMemo(() => {
    return rawHtml
      .replace(/\{\{FMCK_IMAGE_URL\}\}/g, fmckImg || '/fmck.jpeg')
      .replace(/\{\{FMCK_LOGO_URL\}\}/g, logoImg || '/logo.png');
  }, []);

  return (
    <iframe
      srcDoc={htmlContent}
      title="FMC Kumo Staff MPCS Ltd"
      className="w-full h-screen border-none"
      style={{
        width: '100%',
        height: '100vh',
        border: 'none',
        display: 'block',
        margin: 0,
        padding: 0
      }}
    />
  );
}