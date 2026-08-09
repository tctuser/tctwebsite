export const club = {
  name: 'Tennisclub Trier 1888 e.V.',
  shortName: 'TCT 1888',
  address: 'Am Stadion 1, 54292 Trier',
  email: 'info@tennisclub-trier.de',
  phone: '+49 172 7810798',
  bookingUrl: 'https://booking.tennisclubtrier.de/Web/view-schedule.php',
  padelUrl: 'https://padel.youcanbook.me/',
  schoolUrl: 'https://tennisschulepoint.de/',
  sourceUrl: '',
}

export const board = [
  ['Alexander Jelen', '1. Vorsitzender'],
  ['Roland Mohr', '2. Vorsitzender'],
  ['Oliver Kayser', 'Jugendwart'],
  ['Anja Baumgart', 'Schatzmeisterin'],
  ['Henry Lozano', 'Sportwart'],
  ['Simone Göbel', 'Event-Managerin'],
] as const

export const teamGroups = [
  { name: 'Herren', number: '01', text: 'Mannschaften des TCT im Herrenbereich.', note: 'Die 1. Herrenmannschaft spielte 2025 in der Verbandsliga und hielt die Klasse.' },
  { name: 'Damen', number: '02', text: 'Mannschaften des TCT im Damenbereich.', note: 'Aktuelle Aufstellungen und Tabellen werden saisonal veröffentlicht.' },
  { name: 'Jugend', number: '03', text: 'Nachwuchsmannschaften des TCT.', note: 'Aktuelle Aufstellungen und Tabellen werden saisonal veröffentlicht.' },
] as const

export const teamGallery = [
  { category: 'Damen', title: 'Damen 1', image: '/assets/tct/teams/damen-1.jpg' },
  { category: 'Damen', title: 'Damen 2 & Damen 3', image: '/assets/tct/teams/damen-2-3.jpg' },
  { category: 'Herren', title: 'Herren 1', image: '/assets/tct/teams/herren-1.jpg' },
  { category: 'Herren', title: 'Herren 2 & Herren 4', image: '/assets/tct/teams/herren-2-4.jpg' },
  { category: 'Herren', title: 'Herren 5 & Academy', image: '/assets/tct/teams/herren-5-academy.jpg' },
  { category: 'Damen', title: 'Damen 30 & Damen 50', image: '/assets/tct/teams/damen-30-50.jpg' },
  { category: 'Herren', title: 'Damen 50 & Herren 30', image: '/assets/tct/teams/damen-50-herren-30.jpg' },
  { category: 'Herren', title: 'Herren 40 & Herren 50', image: '/assets/tct/teams/herren-40-50.jpg' },
  { category: 'Herren', title: 'Herren 60 & M18-1', image: '/assets/tct/teams/herren-60-m18-1.jpg' },
  { category: 'Jugend', title: 'M18-1 & J18-1', image: '/assets/tct/teams/m18-1-j18-1.jpg' },
  { category: 'Jugend', title: 'J18-3 & J15-2', image: '/assets/tct/teams/j18-3-j15-2.jpg' },
  { category: 'Jugend', title: 'U12', image: '/assets/tct/teams/u12.jpg' },
  { category: 'Jugend', title: 'U10', image: '/assets/tct/teams/u10.jpg' },
] as const

export const history = [
  ['1888', 'Gründung der Tennisgesellschaft'],
  ['1913', 'Gründung der Tennisvereinigung Trier'],
  ['1986', 'Erstes Satellite-Turnier'],
  ['1997', 'Fusion zum Tennisclub Trier 1888 e.V.'],
] as const

export const historyDetails: Record<string, { image: string; label: string; text: string }> = {
  '1888': { image: '/assets/tct/history/tc-trier.jpg', label: '1. Baustein', text: 'Mit der Tennisgesellschaft begann die Geschichte des heutigen Tennisclub Trier.' },
  '1913': { image: '/assets/tct/history/tc-trier.jpg', label: '2. Baustein', text: 'Die Tennisvereinigung Trier legte den zweiten Grundstein für den späteren TCT.' },
  '1986': { image: '/assets/tct/history/itf-1986.jpg', label: '1. ITF-Turnier', text: 'Das erste Satellite-Turnier – der Ursprung des heutigen ITF World Tennis Tour Herren-Turniers.' },
  '1997': { image: '/assets/tct/history/tc-trier.jpg', label: 'Die Fusion', text: 'Tennisgesellschaft und Tennisvereinigung bündelten ihre Kräfte zum Tennisclub Trier 1888 e.V.' },
}

export const boardPortraits: Record<string, string> = {
  'Alexander Jelen': '/assets/tct/history/alexander-jelen.png',
  'Anja Baumgart': '/assets/tct/history/anja-baumgart.png',
}

export const facilities = [
  { number: '21', label: 'Außenplätze', text: 'Sandplätze auf der Anlage am Moselstadion.' },
  { number: '3', label: 'Hallenplätze', text: 'Auch außerhalb der Sommersaison buchbar.' },
  { number: '01', label: 'Padelplatz', text: 'Der erste Padelplatz in Rheinland-Pfalz.' },
] as const

export const facilityExperiences = [
  { eyebrow: 'SOMMERPARADIES', title: 'Außenplätze', text: '21 Sandplätze auf der weitläufigen Anlage am Moselstadion.', action: 'Tennisplatz buchen', href: 'https://booking.tennisclubtrier.de/Web/view-schedule.php', image: 'facility' },
  { eyebrow: 'AUSSERHALB DER SAISON', title: 'Tennishalle', text: 'Drei Hallenplätze sind für Mitglieder und Nicht-Mitglieder buchbar.', action: 'Halle buchen', href: 'https://booking.tennisclubtrier.de/Web/view-schedule.php', image: 'hall' },
  { eyebrow: 'TRENDSPORT', title: 'Padel', text: 'Der erste Padelplatz in Rheinland-Pfalz auf der TCT-Anlage.', action: 'Padel buchen', href: 'https://padel.youcanbook.me/', image: 'padel' },
  { eyebrow: 'RESTAURANT & CAFÉ', title: 'La Palma', text: 'Restaurant & Café auf der Anlage des Tennisclub Trier.', action: 'Anlage entdecken', href: '#anlage', image: 'restaurant' },
] as const

export const membership = [
  ['Aktive Mitglieder', '295 €', '42,00 € / Monat*'],
  ['Ehepaare · pro Person', '245 €', '35,00 € / Monat*'],
  ['Studierende · 18–28 Jahre', '120 €', '17,00 € / Monat*'],
  ['Jugendliche · bis 18 Jahre', '105 €', '15,00 € / Monat*'],
] as const

export const downloads = [
  { category: 'MITGLIEDSCHAFT', title: 'Aufnahmeantrag', text: 'Antrag zur Aufnahme in den Tennisclub Trier 1888 e.V.', file: '/assets/tct/downloads/aufnahmeantrag.pdf' },
  { category: 'TENNISHALLE', title: 'Hallenpreise', text: 'Aktuelle Preisübersicht für die Tennishalle.', file: '/assets/tct/downloads/hallenpreise.pdf' },
] as const

export const officialLinks = {
  teams: 'https://www.rlp-tennis.de/liga/vereine/verein/mannschaften/v/10709.html',
  instagram: 'https://www.instagram.com/tennisclubtrier',
  facebook: 'https://www.facebook.com/Tennisclub-Trier-1888-eV-384052550114/',
}

export const legacyNews = [
  ['26.06.2026', 'Etges & Dächert Open Trier 2026'],
  ['05.05.2026', 'DTB Herren A7'],
  ['11.12.2025', 'Mitgliederversammlung 2025'],
  ['28.08.2025', 'Etges & Dächert Trier Open'],
  ['23.06.2025', 'Padeltennis im TC Trier'],
  ['29.08.2024', 'Etges & Dächert Open 2024'],
  ['12.06.2024', '1. Damen / 1. Herren 2024'],
  ['18.01.2024', 'Rheinlandmeister 2023'],
  ['18.01.2024', 'Damen 1 Oberliga'],
  ['07.12.2023', 'Padel'],
  ['04.12.2023', 'Jahreshauptversammlung 2023'],
  ['05.09.2023', 'Etges & Dächert Open Trier 2023'],
  ['13.07.2023', 'Etges & Dächert Open Trier 2023'],
  ['10.02.2023', 'Luxoil Open Trier 2022'],
  ['06.02.2023', 'Wahnsinns-Stimmung beim Davis Cup in Trier'],
  ['01.02.2023', 'Davis Cup in Trier'],
  ['05.09.2021', 'Luxoil Open Trier 2021'],
] as const

export const officialImages = {
  logo: '/assets/tct/images/tct-logo.jpg',
  facility: '/assets/tct/images/anlage.jpg',
  hall: '/assets/tct/images/tennishalle.jpg',
  padel: '/assets/tct/images/padelplatz.jpg',
  restaurant: '/assets/tct/images/la-palma.png',
  court: '/assets/tct/images/hero-anlage.jpeg',
  player: '/assets/tct/images/spieler-itf.jpg',
  tournament: '/assets/tct/images/turnier-itf.jpg',
  school: '/assets/tct/images/tennisschule.jpeg',
}
