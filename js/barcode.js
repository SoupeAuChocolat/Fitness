// Scan de code-barres (ML Kit) et recherche du produit sur Open Food Facts.
import { BarcodeScanner, CapacitorHttp, isNative } from './native.js';

export const canScan = () => !!BarcodeScanner;

export async function scanBarcode() {
  const { available } = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
  if (!available) {
    await BarcodeScanner.installGoogleBarcodeScannerModule();
    throw new Error('Le module de scan de Google s’installe, réessaie dans quelques secondes.');
  }
  const { barcodes } = await BarcodeScanner.scan({ formats: ['EAN_13', 'EAN_8', 'UPC_A', 'UPC_E'] });
  return barcodes[0]?.rawValue || null;
}

const num = (v) => (v == null || v === '' || Number.isNaN(Number(v)) ? null : Number(v));

// Convertit une fiche Open Food Facts en aliment de l'app (valeurs pour 100 g).
export function productToFood(code, product) {
  const n = product.nutriments || {};
  const name = (product.product_name_fr || product.product_name || '').trim() || `Produit ${code}`;
  const brand = (product.brands || '').split(',')[0].trim();
  let kcal = num(n['energy-kcal_100g']);
  if (kcal == null && num(n.energy_100g) != null) kcal = num(n.energy_100g) / 4.184;
  const serving = num(product.serving_quantity);
  return {
    n: brand && !name.toLowerCase().includes(brand.toLowerCase()) ? `${name} (${brand})` : name,
    p: '100 g',
    g: 100,
    k: kcal == null ? null : Math.round(kcal),
    prot: num(n.proteins_100g),
    carb: num(n.carbohydrates_100g),
    fat: num(n.fat_100g),
    serving: serving && serving > 0 ? serving : null,
    servingLabel: product.serving_size || null,
    barcode: code,
    c: 'Produits scannés',
  };
}

export async function lookupBarcode(code) {
  const fields = 'product_name,product_name_fr,brands,serving_size,serving_quantity,nutriments';
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${fields}`;
  let data;
  if (isNative && CapacitorHttp) {
    const res = await CapacitorHttp.get({ url, headers: { 'User-Agent': 'MaForme/2.0 (Android; suivi personnel)' } });
    data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
  } else {
    const res = await fetch(url);
    data = await res.json();
  }
  if (!data || data.status !== 1 || !data.product) return null;
  return productToFood(code, data.product);
}
