import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from './firebase';
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
        <div className="mb-12">
          <img
            src="https://firebasestorage.googleapis.com/v0/b/chargedrops-dev.firebasestorage.app/o/logos%2Fsite%2Fhownew.png?alt=media&token=da7bfa78-4219-4ea4-b92c-a2d87649e531"
            alt="How Chargedrops works infographic"
            className="w-full h-auto rounded-lg shadow-md"
          />
        </div>
        {loading ? (
          <p className="text-center text-gray-500">Loading cities...</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {cities.map(city => (
              <Link to={`/map/${city.slug}`} key={city.id} className="flex flex-col items-center justify-center gap-3 rounded-lg bg-white p-4 text-center font-semibold text-gray-800 shadow-sm transition hover:shadow-md h-32">
                {city.logoUrl ? (
                  <img src={city.logoUrl} alt={city.displayName} className="h-12 max-w-full object-contain" />
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