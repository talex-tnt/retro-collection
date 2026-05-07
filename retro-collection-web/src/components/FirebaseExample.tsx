import { getFirestore, collection, addDoc, getDocs } from 'firebase/firestore';
import { useState, useEffect } from 'react';
import { type FirebaseApp } from 'firebase/app';

interface FirebaseExampleProps {
  app: FirebaseApp;
}

function FirebaseExample({ app }: FirebaseExampleProps) {
  const db = getFirestore(app);

  const [name, setName] = useState('');
  const [items, setItems] = useState<{ id: string; name: string }[]>([]);

  // Function to add an item to Firestore
  const addItem = async () => {
    if (name.trim()) {
      try {
        await addDoc(collection(db, 'items'), { name });
        setName(''); // Clear input
        fetchItems(); // Refresh list
      } catch (error) {
        console.error('Error adding item:', error);
      }
    }
  };

  // Function to retrieve items from Firestore
  const fetchItems = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'items'));
      const fetchedItems = querySnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name as string,
      }));
      setItems(fetchedItems);
    } catch (error) {
      console.error('Error fetching items:', error);
    }
  };

  // Fetch items on component mount
  useEffect(() => {
    fetchItems();
  }, []);

  return (
    <div>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Enter name"
      />
      <button onClick={addItem}>Add Item</button>
      <ul>
        {items.map((item) => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
    </div>
  );
}

export default FirebaseExample;