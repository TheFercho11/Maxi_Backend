// hash-password.js nada mas lo hice para generar el hash de la contraseña admin y poder tener contras encriptadas na mas
// para que no quede en texto plano en la base de datos
// se usa una libreria llamada bcrypt
// para instalarla usar el comando: npm install bcrypt
// luego ejecutar este archivo con el comando: node hash-password.js
// y seguir las instrucciones en la consola
const bcrypt = require('bcrypt');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('--- Generador de Contraseña Segura para Maxi Despensa ---');
rl.question('Escribe la nueva contraseña de administrador y presiona Enter: ', (password) => {
  if (!password) {
    console.error('La contraseña no puede estar vacía.');
    rl.close();
    return;
  }

  const saltRounds = 10;
  bcrypt.hash(password, saltRounds, (err, hash) => {
    if (err) {
      console.error('Error al generar el hash:', err);
      rl.close();
      return;
    }
    console.log('\n¡Hash generado exitosamente!');
    console.log('Copia la siguiente línea completa (empieza con $2b$):');
    console.log('----------------------------------------------------');
    console.log(hash);
    console.log('----------------------------------------------------');
    console.log('Pega este hash en el comando SQL para crear tu usuario administrador.');
    rl.close();
  });
});