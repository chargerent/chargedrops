import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import {
  MdAssignmentReturn,
  MdBatteryChargingFull,
  MdLocationCity,
  MdMap,
  MdQrCode2,
} from 'react-icons/md';
import { db } from './firebase';
import { STANDARD_RENTAL_PRICING } from './cityConfig';
import chargedropsLogo from '/chargedrop_logo.svg';

type City = {
  id: string;
  slug: string;
  displayName: string;
  logoUrl?: string;
};

const CitiesIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-gray-400">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h6M9 11.25h6M9 15.75h6M4.5 21v-3.375c0-.621.504-1.125 1.125-1.125h11.25c.621 0 1.125.504 1.125 1.125V21" />
  </svg>
);

const formatUsd = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: STANDARD_RENTAL_PRICING.currency,
    maximumFractionDigits: 0,
  }).format(amount);

const howItWorksSteps = [
  {
    title: 'Choose a City',
    description: 'Select a city below.',
    icon: <MdLocationCity className="h-8 w-8" aria-hidden="true" />,
  },
  {
    title: 'Find a Station',
    description: 'Find a location on the map.',
    icon: <MdMap className="h-8 w-8" aria-hidden="true" />,
  },
  {
    title: 'Scan the QR Code',
    description: 'Use your camera to scan the code on the station. No app required.',
    icon: <MdQrCode2 className="h-8 w-8" aria-hidden="true" />,
  },
  {
    title: 'Rent a Charger',
    description: `${formatUsd(STANDARD_RENTAL_PRICING.hourlyRate)} per hour, up to ${formatUsd(STANDARD_RENTAL_PRICING.nonReturnFee)}.`,
    icon: <MdBatteryChargingFull className="h-8 w-8" aria-hidden="true" />,
  },
  {
    title: 'Return',
    description: 'Return the charger to any Chargedrops location.',
    icon: <MdAssignmentReturn className="h-8 w-8" aria-hidden="true" />,
  },
];

const HomePage: React.FC = () => {
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCities = async () => {
      try {
        const citiesRef = collection(db, 'cities');
        const q = query(citiesRef, orderBy('displayName', 'asc'));
        const snapshot = await getDocs(q);
        const cityList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as City));
        setCities(cityList);
      } catch (error) {
        console.error("Error fetching cities:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCities();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-center">
          <img src={chargedropsLogo} alt="Chargedrops" className="h-8 w-auto" />
        </div>
      </header>
      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <section className="mx-auto mb-12 max-w-xl rounded-2xl bg-white px-6 py-7 shadow-md" aria-labelledby="how-it-works-title">
          <h1 id="how-it-works-title" className="mb-7 text-center text-2xl font-extrabold tracking-wide text-slate-900 sm:text-3xl">
            HOW IT WORKS
          </h1>
          <ol className="space-y-6">
            {howItWorksSteps.map((step) => (
              <li key={step.title} className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 ring-1 ring-slate-200">
                  {step.icon}
                </div>
                <div>
                  <h2 className="text-lg font-bold leading-tight text-slate-900">{step.title}</h2>
                  <p className="mt-1 text-sm leading-snug text-slate-600">{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
        {loading ? (
          <p className="text-center text-gray-500">Loading cities...</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {cities.map(city => (
              <Link to={`/map/${city.slug}`} key={city.id} className="flex flex-col items-center justify-center gap-3 rounded-lg bg-white p-4 text-center font-semibold text-gray-800 shadow-sm transition hover:shadow-md h-32">
                {city.logoUrl ? (
                  <img src={city.logoUrl} alt={city.displayName} className="h-16 w-24 object-contain" />
                ) : (
                  <CitiesIcon />
                )}
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default HomePage;
