import type { SVGProps } from 'react'

export type IconName = 'hand' | 'clock' | 'cube' | 'bus' | 'car' | 'ship' | 'arrow' | 'back' | 'check' | 'chevron' | 'close' | 'copy' | 'ear' | 'eye' | 'heart' | 'info' | 'list' | 'lock' | 'message' | 'mic' | 'more' | 'play' | 'plus' | 'search' | 'send' | 'settings' | 'steps' | 'upload' | 'user' | 'wheelchair' | 'oxygen' | 'cane' | 'trash' | 'volume' | 'train' | 'plane' | 'camera' | 'cart' | 'spark'
  | 'hospital' | 'map-pin' | 'home' | 'briefcase' | 'book-open' | 'leaf' | 'handshake' | 'documents' | 'equipment-care' | 'digital-form' | 'home-connect'

const paths: Record<IconName, string> = {
  hospital: 'M7 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 21v-9a2 2 0 0 1 2-2h2M17 10h2a2 2 0 0 1 2 2v9M2 21h20M10 21v-5h4v5M12 7v5M9.5 9.5h5',
  'map-pin': 'M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0zM14.5 10a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z',
  home: 'M3 10.5 10.7 4a2 2 0 0 1 2.6 0l7.7 6.5M5 9v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9M9.5 21v-7h5v7',
  briefcase: 'M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M5 7h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2zM3 12a22 22 0 0 0 18 0M10 13v3h4v-3',
  'book-open': 'M12 6c-2.5-2-5.5-2.5-9-2v15c3.5-.5 6.5 0 9 2 2.5-2 5.5-2.5 9-2V4c-3.5-.5-6.5 0-9 2zM12 6v15M6 8h2.5M6 12h2.5M15.5 8H18M15.5 12H18',
  leaf: 'M20.5 3.5C13 2 5 5 5 12a6 6 0 0 0 6 6c7 0 10-7 9.5-14.5zM3 21l12-12M8 16v-5M8 16h5',
  handshake: 'M4 6 2 11l4 2 2-5-4-2zM20 6l2 5-4 2-2-5 4-2zM8 8l3-2h2l3 2M8 8l3 3a1.6 1.6 0 0 0 2.2 0l.8-.8M6 13l4.5 4.5a2 2 0 0 0 2.8 0L18 13M9 14l3 3M12 13l3 3',
  documents: 'M8 3h8l4 4v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM16 3v4h4M3 7v11M9.5 11h7M9.5 15h3M9.5 18h5',
  'equipment-care': 'M3 3h10M5 3v6a3 3 0 0 0 6 0V3M5 7h6M8 12v9M5.5 21h5M20 3a3 3 0 0 0-3.4 4.3l-3.2 9.3a1.5 1.5 0 0 0 2.8 1l3.2-9.3A3 3 0 0 0 22 4.7l-1.3 2-1.8-.6L20 3z',
  'digital-form': 'M7 2.5h10a2 2 0 0 1 2 2v15a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-15a2 2 0 0 1 2-2zM9 6h6M9 10h6M8.5 14l2 2 4.5-4M11 18.5h2',
  'home-connect': 'M3 10.5 10.7 4a2 2 0 0 1 2.6 0l7.7 6.5M5 9v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9M8 13a6 6 0 0 1 8 0M10 15.5a3 3 0 0 1 4 0M12 18h.01',
 hand:'M8 12V5a1.5 1.5 0 0 1 3 0v6M11 11V3a1.5 1.5 0 0 1 3 0v8M14 11V5a1.5 1.5 0 0 1 3 0v7M17 12V8a1.5 1.5 0 0 1 3 0v7c0 4-2 7-6 7h-2c-3 0-4-2-6-5l-3-4a1.6 1.6 0 0 1 2-2l3 3',
 clock:'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20M12 6v6l4 2',
 cube: 'M12 2l9 5v10l-9 5-9-5V7zM3 7l9 5 9-5M12 12v10',
  bus: 'M5 3h14v15H5zM5 11h14M9 3v8M8 15h.01M16 15h.01M7 18v3M17 18v3', car: 'M3 11l3-6h12l3 6v7H3zM3 11h18M7 15h.01M17 15h.01M6 18v3M18 18v3', ship: 'M12 3v12M12 3l7 9h-7M9 6l-5 6h5M2 16h20l-4 5H6z',
  arrow: 'M5 12h14M13 6l6 6-6 6', back: 'M15 18l-6-6 6-6', check: 'M5 12l4 4L19 6', chevron: 'M9 5l7 7-7 7', close: 'M6 6l12 12M18 6L6 18', copy: 'M9 9h10v10H9zM5 5h10v4M5 5v10h4', ear: 'M7 14.5c0-3 1.4-5 4.7-5 3 0 4.3 1.8 4.3 4 0 2.3-1.7 3.2-3.3 3.6-1 .3-1.7 1-1.7 2.4', eye: 'M2.5 12s3.2-5 9.5-5 9.5 5 9.5 5-3.2 5-9.5 5-9.5-5-9.5-5zM12 14.8a2.8 2.8 0 1 0 0-5.6 2.8 2.8 0 0 0 0 5.6z', heart: 'M20.8 8.9c0 5.3-8.8 10.3-8.8 10.3S3.2 14.2 3.2 8.9A4.3 4.3 0 0 1 12 6.3a4.3 4.3 0 0 1 8.8 2.6z', info: 'M12 16v-4M12 8h.01M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', list: 'M5 6h.01M9 6h10M5 12h.01M9 12h10M5 18h.01M9 18h10', lock: 'M5 11h14v10H5zM8 11V8a4 4 0 0 1 8 0v3', message: 'M4 5h16v11H8l-4 4z', mic: 'M12 15a3 3 0 0 0 3-3V7a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3zM19 12a7 7 0 0 1-14 0M12 19v3M8 22h8', more: 'M5 12h.01M12 12h.01M19 12h.01', play: 'M8 5l11 7-11 7z', plus: 'M12 5v14M5 12h14', search: 'M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16zM21 21l-4.3-4.3', send: 'M3 11.5L21 3l-4 18-5.4-6.5L3 11.5zM11.6 14.5L21 3', settings: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM19.4 15a1.8 1.8 0 0 0 .4 2l.1.1-1.8 1.8-.1-.1a1.8 1.8 0 0 0-2-.4 1.8 1.8 0 0 0-1.1 1.7v.1h-2.6v-.1a1.8 1.8 0 0 0-1.1-1.7 1.8 1.8 0 0 0-2 .4l-.1.1-1.8-1.8.1-.1a1.8 1.8 0 0 0 .4-2 1.8 1.8 0 0 0-1.7-1.1H6v-2.6h.1a1.8 1.8 0 0 0 1.7-1.1 1.8 1.8 0 0 0-.4-2l-.1-.1 1.8-1.8.1.1a1.8 1.8 0 0 0 2 .4A1.8 1.8 0 0 0 12.3 5v-.1h2.6V5a1.8 1.8 0 0 0 1.1 1.7 1.8 1.8 0 0 0 2-.4l.1-.1 1.8 1.8-.1.1a1.8 1.8 0 0 0-.4 2 1.8 1.8 0 0 0 1.7 1.1h.1v2.6H21a1.8 1.8 0 0 0-1.6 1.2z', steps: 'M5 4h14M5 10h14M5 16h14M5 22h14M7 4v18', upload: 'M12 16V4M7 9l5-5 5 5M5 20h14', user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0', wheelchair: 'M11 5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM10 7l-2 7h4l2 6M8 14l-4 0M12 14h4l3 6', oxygen: 'M6 4h12v16H6zM9 8h6M9 12h6M9 16h3', cane: 'M8 3c2 0 3 1 3 3v5c0 2-1 4-3 5l-1 1M13 8h6M17 8v12M13 20h8', trash: 'M5 7h14M10 11v6M14 11v6M8 7l1-3h6l1 3M7 7l1 14h8l1-14', volume: 'M5 10v4h3l4 4V6l-4 4H5zM16 9a4 4 0 0 1 0 6M18.5 6.5a7 7 0 0 1 0 11', train: 'M5 4h14v12H5zM7 20h10M8 16v4M16 16v4M8 8h8M8 12h.01M16 12h.01', plane: 'M3 12h18M12 3v18M5 7l7 5 7-5M5 17l7-5 7 5', camera: 'M4 7h4l1.5-2h5L16 7h4v12H4zM12 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', cart: 'M3 4h2l2.3 11h10.9l2-8H6M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM18 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2z', spark: 'M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5z',
}

export function Icon({ name, size = 22, strokeWidth = 1.9, ...props }: { name: IconName; size?: number; strokeWidth?: number } & SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name]} /></svg>
}

