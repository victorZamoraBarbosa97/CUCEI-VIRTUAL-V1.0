# CUCEI-Virtual-V2

CUCEI VIRTUAL CUCEI virtual es un videojuego de carácter social en tercera persona que simula un recorrido virtual por las instalaciones del Centro Universitario de Ciencias Exactas e Ingenierías perteneciente a la Universidad de Guadalajara, su principal función es la de dar a conocer las instalaciones a las personas de nuevo ingreso, aspirantes o cualquier persona con el interés de conocer el centro universitario.

## Pre-requisitos 📋

* **Node.js -v16.13.2** (_Entorno de ejecucion_)
* **XAMPP v3.3.0** (_Para la conexion con la Base de datos_)

## Configuracion de la Base de Datos 🔧
1.  _Una vez instalado XAMPP iniciamos el servicio de MySQL y Apache_
![Servicio de MySQL y Apache iniciados](https://raw.githubusercontent.com/victorZamoraBarbosa97/cucei-virtual/23f191e07e78d5b65223fe485beb9bb5f6951607/img-readme/XAMPP.png) <br/>
2.  _A continuación ingresamos desde nuestro navegador de preferencia a la siguiente ruta para acceder al panel de control de MySQL_

```
http://localhost/phpmyadmin/
```
3.  _Una vez dentro del panel de control buscamos en el menu lateral izquierdo la opcion para crear una nueva base de datos_
4.  _La base de datos debe de llevar como nombre 'login_register_db' con la configuracion mostrada en la imagen_
```
login_register_db
```
![Servicio de MySQL y Apache iniciados](https://github.com/victorZamoraBarbosa97/cucei-virtual/blob/main/img-readme/phpMyAdmin.png) <br/>
5.  _Una vez creada la base de datos ingresamos a esta desde el menu lateral izquierdo y Buscamos en el menu superior la pestaña para importar tablas desde nuestro equipo_

![Importando tablas](https://github.com/victorZamoraBarbosa97/cucei-virtual/blob/main/img-readme/importar.png?raw=true) <br/>
6. _Damos clic en seleccionar archivo y buscamos nuestro archivo descargado desde este repositorio  "usuarios.sql" dejamos toda la configuracion por defecto y damos clic en continuar._

## Instalación de  modulos necesarios desde npm 🔧
_Una vez descargado e instalado Node.js -v16.13.2 abrimos una consola de comandos en la direccion raiz de nuestro proyectoy  ejecutamos el siguiente comando para instalar todos los modulos necesarios_

```
npm install  bcryptjs, dotenv, ejs, express, express-session, express-socket.io-session, mysql, socket.io, nodemon 
```

## Despliegue 📦
_En la Direccion Raiz del proyecto ejecutar el siguiente comando_
```
node app.js
```
_Si no hay errores en la configuracion nos mostrara el siguiente mensaje indicandonos el puerto al que se conecto nuestra app y el estatus de conexión a la base de datos_
![Mensaje desde CMD](https://github.com/victorZamoraBarbosa97/cucei-virtual/blob/main/img-readme/cmd%20run.png?raw=true) <br/>
_Ya podemos ingresar a nuestra app desde cualquier navegador en nuestro equipo_

```
http://localhost:2002/
```