const s = '7 févr.';
console.log('String:', s);
console.log('Match:', /^\d{1,2}\s\w+\.?$/.test(s));
console.log('Match2:', /^\d{1,2}\s.+$/.test(s));
