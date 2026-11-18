// Almacenamiento en el propio teléfono (IndexedDB) para que nada se pierda al
// recargar la página: la cola de fotos por subir y los cambios ya guardados que
// todavía no aparecen en el sitio publicado.
//
// Si el navegador no permite IndexedDB (modo privado muy estricto), funciona
// igual pero solo en memoria.

export type ItemCola = {
  id: string;
  tipo: 'obra' | 'foto-expo';
  creado: number;
  /** Datos del formulario (alumno, mes, técnica…) o { expo } para fotos de exposición */
  campos: Record<string, string>;
  foto: Blob;
  ancho: number;
  alto: number;
  estado: 'espera' | 'error';
  error?: string;
};

export type Pendiente = {
  /** Clave única: un cambio nuevo sobre lo mismo reemplaza al anterior */
  id: string;
  /** Hora del servidor en que se guardó (ms) */
  t: number;
  tipo: 'obra' | 'obra-borrada' | 'sitio' | 'foto-expo' | 'foto-expo-quitada' | 'expo' | 'foto-sitio';
  datos: any;
  foto?: Blob;
};

type Tablas = { cola: ItemCola; pendientes: Pendiente };
type Tabla = keyof Tablas;

const memoria: { [K in Tabla]: Map<string, Tablas[K]> } = { cola: new Map(), pendientes: new Map() };
let base: Promise<IDBDatabase | null> | null = null;

function abrir(): Promise<IDBDatabase | null> {
  return (base ??= new Promise((resolve) => {
    try {
      const pet = indexedDB.open('breda-editor', 1);
      pet.onupgradeneeded = () => {
        pet.result.createObjectStore('cola', { keyPath: 'id' });
        pet.result.createObjectStore('pendientes', { keyPath: 'id' });
      };
      pet.onsuccess = () => resolve(pet.result);
      pet.onerror = () => resolve(null);
      pet.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  }));
}

async function operar<R>(tabla: Tabla, modo: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<R>): Promise<R | undefined> {
  const db = await abrir();
  if (!db) return undefined;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(tabla, modo);
    const pet = fn(tx.objectStore(tabla));
    tx.oncomplete = () => resolve(pet.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export const almacen = {
  async todos<T extends Tabla>(tabla: T): Promise<Tablas[T][]> {
    try {
      const r = await operar<Tablas[T][]>(tabla, 'readonly', (s) => s.getAll() as IDBRequest<Tablas[T][]>);
      if (r) return r;
    } catch {}
    return [...memoria[tabla].values()] as Tablas[T][];
  },
  async poner<T extends Tabla>(tabla: T, valor: Tablas[T]) {
    (memoria[tabla] as Map<string, Tablas[T]>).set(valor.id, valor);
    try {
      await operar(tabla, 'readwrite', (s) => s.put(valor));
    } catch {}
  },
  async quitar(tabla: Tabla, id: string) {
    memoria[tabla].delete(id);
    try {
      await operar(tabla, 'readwrite', (s) => s.delete(id));
    } catch {}
  },
};
