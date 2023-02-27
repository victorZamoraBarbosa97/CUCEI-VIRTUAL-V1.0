// Server 
// importando las librerias
const bcryptjs = require('bcryptjs'); // modulo para encriptar las contraseñas
const session = require('express-session'); // para las sesiones del ususarios
const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
var bodyParser = require('body-parser');


// levantar el servidor
http.listen(2002, function(){
	console.log('Escuchando el puerto 2002');
});
  

// setear urlencoded para capturar los datos del formulario
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

//app.use(express.urlencoded({extended:true}));
//app.use(express.json());

// invocamos a dotenv
const dotenv = require('dotenv');
//const { dirname } = require('path');
dotenv.config({path:'./env/.env'})

// donde cargar los archivos estaticos
app.use('/resources',express.static('public'));
// app.use('/resources', express.static(__dirname + '/public'));

// funciones para chat global 
const { generateMessage, generateLocationMessage } = require('./public/js/message.js')
const { isRealString } = require('./public/js/validation')
const { Users } = require('./public/js/users')
const users = new Users()

//motor de plantillas
app.set('view engine','ejs');

//6 -Invocamos a bcrypt
const bcrypt = require('bcryptjs');

// variables de sesion
app.use(session({
	// tipos de sesiones del usuario
	secret:'keyboard cat',
	// como se van a guardar las sesiones
	resave: true,
	saveUninitialized: true,
	maxAge: 3600000
}));

// invocamos al modulo de de conexion de la BD
const conection = require('./database/db');
const req = require('express/lib/request');
const res = require('express/lib/response');
const { getPackedSettings } = require('http2');
const { NONAME } = require('dns');

// Seteamos direcciones del progrma
app.get('/login',(req, res)=>{
	res.render('login');
})

// Para consultar a la BD y obtener la config del atuendo del personaje del usuario
app.post('/skin', (req, res) =>{
	if (req.session.loggedin) {
		//  hacer una consulta  a la BD a la tabla skins y extraer todas las columnas de la configuracion del usuario
		conection.query('SELECT * FROM skins WHERE id = ?', [req.session.user_id], async (correo_sql, results)=> {
			// extraer todas las columnas de la tabla
			req.session.user_modelo = results[0].modelo;
			req.session.user_atuendo = results[0].atuendo;
			req.session.user_color = results[0].color;

			res.render('skin',{
				id: req.session.user_id,
				modelo: req.session.user_modelo,
				atuendo: req.session.user_atuendo,
				color: req.session.user_color
			});	
		});
	}
})

// Para actualizar los valores de personalizacion del usuario
app.post('/save-skin', (req, res) =>{
	let modelo = req.body.modeloF;
	let atuendo = req.body.atuendoF;
	let color = req.body.colorF;
	conection.query('UPDATE skins SET modelo = ?, atuendo = ?, color = ? WHERE id = ?',[modelo,atuendo,color,req.session.user_id],function (error, results, fields) {
		if (error) throw error;
		// ******************************************* PENDIENTE SWET ALERT CONFIRMANDO QUE SE GUARDARON LOS CAMBIOS
		res.render('index',{
			login: true,
			name: req.session.name,
			room: 'global'		// por default el servidor es global
		});	
	});

})


// Iniciar sesion
app.post('/auth', async (req, res) => {
	// obteniendo los datos
	const correo = req.body.correo; 
	const pass = req.body.contrasena;
	// encriptar la password
	let passwordHaash = await bcryptjs.hash(pass, 8);
	// verificar que los datos fueron ingresados
	if(correo && pass){
		conection.query('SELECT * FROM usuarios WHERE correo = ?', [correo], async (correo, results)=> { // verificar solo correo
			if( results.length == 0 || !(await bcrypt.compare(pass, results[0].contrasena)) ) { 			// si no encontramos el usuario o la contraseña es incorrecta
				// SWEET ALERT 
				res.render('login', {
					alert: true,
					alertTitle: "Error",
					alertMessage: "USUARIO y/o PASSWORD incorrectas",
					alertIcon:'error',
					showConfirmButton: true,
					timer: '',
					ruta: 'login'
				});
			}else{
				//creamos una var de sesion y le asignamos true si INICIO SESSION       
				req.session.loggedin = true;               
				req.session.name = results[0].nombre_completo; // guardamos el nombre completo del usuario
				req.session.user_id = results[0].id; // guardamos el id del usuario

				res.render('login', {
					alert: true,
					alertTitle: "Conexión exitosa",
					alertMessage: "¡LOGIN CORRECTO!",
					alertIcon:'success',
					showConfirmButton: false,
					timer: 1500,
					ruta: ''
				});
			}
		});

	}else{
		res.render('login', {
			alert: true,
			alertTitle: "Advertencia",
			alertMessage: "Por favor ingresa un usuario y una contraseña",
			alertIcon:'warning',
			showConfirmButton: true,
			timer: '',
			ruta: 'login'
		}); 
	}
});

app.post('/game', (req, res) => {
	req.session.respawn = req.body.respawn;

	if(req.session.respawn == undefined || req.session.respawn == ''){
		req.session.respawn = 'B';
	}

	if (req.session.loggedin) { // si hay una sesion iniciada
		// obtenemos los valores de la personalizacion
		conection.query('SELECT * FROM skins WHERE id = ?', [req.session.user_id], async (correo_sql, results2)=> {
			// extraer todas las columnas de la tabla
			req.session.user_modelo = results2[0].modelo;
			req.session.user_atuendo = results2[0].atuendo;
			req.session.user_color = results2[0].color;

			res.render('game',{
				login: true,
				name: req.session.name,
				room: 'global',// por default el servidor es global
				respawn: req.session.respawn,
				modelo : req.session.user_modelo,
				atuendo : req.session.user_atuendo,
				color : req.session.user_color,
				id_usuario : req.session.user_id
			});
		});
		
	}
	else{
		res.render('game',{
			login: false,
			name: "invitado",
			room: "global",	// por default el servidor es global
			respawn: req.session.respawn,
			modelo : 'Cabello 1',
			atuendo: 'Hombre Casual 1',
			color : '3',
			id_usuario : null
		});
	}

})

app.get('/sala', function (req, res){
	if (req.session.loggedin) { // si hay una sesion iniciada
		res.render('sala',{
			login: true,
			name: req.session.name,
			room: req.session.room,		// por default el servidor es global
			respawn: 'B'
		});		
	}
	else{
		res.render('game',{
			login: false,
			name: "invitado",
			room: "global",		// por default el servidor es global
			respawn: 'B'
		});
	}
})

// Configuracion sala
app.get('/select-room',  (req, res) => {
	req.session.room = req.body.room;
	if (req.session.loggedin) { // si hay una sesion iniciada
		res.render('game',{
			login: true,
			name: req.session.name,
			room: req.session.room,		// por default el servidor es global
			respawn: 'B'
		});		
	}
	else{
		res.render('game',{
			login: false,
			name: "invitado",
			room: "global",		// por default el servidor es global
			respawn: 'B'
		});
	}
});




// REGISTRO DE USUARIOS
app.post('/Registro', async (req, res)=>{
	// obteniendo los datos
	const nombre_completo = req.body.nombre_completo;
	const codigo = req.body.codigo;
	const correo = req.body.correo;
	const usuario = req.body.usuario;
	const pass = req.body.contrasena;
	let passwordHash = await bcrypt.hash(pass, 8); // encriptar la contraseña
	const rol = req.body.rol;
	if(correo && pass){
		conection.query('SELECT * FROM usuarios WHERE correo = ?', [correo], async (correo_sql, results)=> { // verificar solo correo
			if( results.length == 0 ) { 			// no existe una cuenta con ese correo
				conection.query('INSERT INTO usuarios SET ?',{nombre_completo:nombre_completo, codigo:codigo, correo:correo, usuario,usuario, contrasena:passwordHash, rol,rol}, async (error, results)=>{
					// Mostrar error o alerta de registro completo
					if(error){
						console.log(error);
					}else{
						// optener el id que se le asigno al usuario.
						conection.query('SELECT * FROM usuarios WHERE correo = ?', [correo], async (correo_sql, results)=> {
							req.session.user_id = results[0].id;

							// agregarlo a la tabla de skins con el skin por default
							conection.query('INSERT INTO skins SET ?',{id:results[0].id, modelo:'Cabello 1', atuendo:'Hombre Casual 1', color:'2'}, async (error, results)=>{
								// Mostrar error o alerta de registro completo
								if(error){
									console.log(error);
								}
							});

							// agregarlo a la tabla de inventario con valores en 0
							conection.query('INSERT INTO inventario SET ?',{id:results[0].id, Botella:0, Libro:0, Laptop:0,Balon:0,Manzana:0}, async (error, results)=>{
								// Mostrar error o alerta de registro completo
								if(error){
									console.log(error);
								}
							});

						});

						res.render('login', {
							alert: true,
							alertTitle: "Registro",
							alertMessage: "¡Registro Completado!",
							alertIcon:'success',
							showConfirmButton: false,
							timer: 2000,
							ruta: 'login'
						});
					}
				});
				
				


			}else{ // si existe una cuenta con ese correo
				// SWEET ALERT 
				res.render('login', {
					alert: true,
					alertTitle: "Error",
					alertMessage: "Ya existe una cuenta con el correo indicado",
					alertIcon:'error',
					showConfirmButton: true,
					timer: '',
					ruta: 'login'
				});
			}
		});
	}
	// insertar en la base de datos 
    
})


// Autenticacion para todas las paginas.
app.get('/', (req, res)=> {
	if (req.session.loggedin) {
		res.render('index',{
			login: true,
			name: req.session.name,
			room: 'global'		// por default el servidor es global
		});		
	} else {
		res.render('index',{
			login:false,
			name:'Invitado',
			room: 'global'			
		});			
	}
	// res.end();
});

// Log out
app.get('/logout', (req, res)=>{
	req.session.destroy(()=>{
		res.render('index',{
			login: false,
			name: 'Invitado',
			room: 'global'
		});
	})
})


/*FUNCIONES SOCKET.IO*/ 

io.sockets.on('connection', (socket) => { 		// funcion por default cuando se conecta un socket

	socket.userData = { x:0, y:0, z:0, heading:0 };		//Localizacion de usuario por default 
 
	console.log(`${socket.id} Conectado:`);
	socket.emit('setId', { id:socket.id });
	
    socket.on('disconnect', function(){ // funcion defaul desconectar 
		socket.broadcast.emit('EliminarJugador', { id: socket.id });
		console.log(`${socket.id} Desconectado`);
    });
	
	socket.on('init', function(data){ // Nuevo usuario conectado 
		socket.userData.modelo = data.modelo;
		socket.userData.color = data.color;
		socket.userData.atuendo = data.atuendo;
		socket.userData.x = data.x;
		socket.userData.y = data.y;
		socket.userData.z = data.z;
		socket.userData.heading = data.h;
		socket.userData.pb = data.pb,
		socket.userData.action = "Idle";
	});
	
	socket.on('update', function(data){
		socket.userData.x = data.x;
		socket.userData.y = data.y;
		socket.userData.z = data.z;
		socket.userData.heading = data.h;// rotacion en 
		socket.userData.pb = data.pb, 	// rotacion en x
		socket.userData.action = data.action;
		// console.log(`Cordenadas x:  ${data.x} Y:${data.y} Z:${data.z}`);
	});

	socket.on('recolectable',function(data){
		/* accion 
		1 = recolectar
		2 = soltar  	 */
		// Consultar cuantos objetos del mismo tipo tiene el jugador
		conection.query('SELECT * FROM inventario WHERE id = ?', [data.id], async (error,results)=> {
			if (error) throw error;
			let cantidad;
			console.log(data.accion);
			if(data.accion == 1){ // objeto recolectado
				switch(data.objeto) {
					case "Botella":
					  	cantidad = results[0].Botella;
					  	cantidad+=1;
					  	conection.query('UPDATE inventario SET Botella = ?  WHERE id = ?',[cantidad,data.id],function (error, results, fields) {
						  if (error) throw error;
					  	});
					  break;
					case "libro":
					  	cantidad = results[0].libro;
					  	cantidad+=1;
						conection.query('UPDATE inventario SET libro = ?  WHERE id = ?',[cantidad,data.id],function (error, results, fields) {
							if (error) throw error;
						});
					  break;
					case "Laptop":
						cantidad = results[0].Laptop;
						cantidad+=1;
						conection.query('UPDATE inventario SET Laptop = ?  WHERE id = ?',[cantidad,data.id],function (error, results, fields) {
							if (error) throw error;
						});
						break;
					case "Balon":
						cantidad = results[0].Balon;
						cantidad+=1;
						conection.query('UPDATE inventario SET Balon = ?  WHERE id = ?',[cantidad,data.id],function (error, results, fields) {
							if (error) throw error;
						});
						break;
					case "Medalla":
						cantidad = results[0].Medalla;
						cantidad+=1;
						conection.query('UPDATE inventario SET Medalla = ?  WHERE id = ?',[cantidad,data.id],function (error, results, fields) {
							if (error) throw error;
						});
						break
					case "Manzana":
						cantidad = results[0].Manzana;
						cantidad+=1;
						conection.query('UPDATE inventario SET Manzana = ?  WHERE id = ?',[cantidad,data.id],function (error, results, fields) {
							if (error) throw error;
						});
						break
					default:
					  	return;
				}
			}
			else if(data.accion == 2){ // objeto soltado
				switch(data.objeto) {
					case "Botella":
						cantidad = results[0].Botella;
						if (cantidad<=0) return;
						cantidad-=1;
					  	conection.query('UPDATE inventario SET Botella = ?  WHERE id = ?',[cantidad,data.id],function (error, results, fields) {});
						io.emit('DropObj', {success : true, objeto: data.objeto, pos:data.pos});
						break;
					case "libro":
						cantidad = results[0].libro;
						if (cantidad<=0) return;
						cantidad-=1;
						conection.query('UPDATE inventario SET libro = ?  WHERE id = ?',[cantidad,data.id],function (error, results, fields) {});
						io.emit('DropObj', {success : true, objeto: data.objeto, pos:data.pos});
					  	break;

					case "Laptop":
						cantidad = results[0].Laptop;
						if (cantidad<=0) return;
						cantidad-=1;
						conection.query('UPDATE inventario SET Laptop = ?  WHERE id = ?',[cantidad,data.id],function (error, results, fields) {});
						io.emit('DropObj', {success : true, objeto: data.objeto, pos:data.pos});
						break;

					case "Balon":
						cantidad = results[0].Balon;
						if (cantidad<=0) return;
						cantidad-=1;
						conection.query('UPDATE inventario SET Balon = ?  WHERE id = ?',[cantidad,data.id],function (error, results, fields) {});
						io.emit('DropObj', {success : true, objeto: data.objeto, pos:data.pos});
						break;

					case "Medalla":
						cantidad = results[0].Medalla;
						if (cantidad<=0) return;
						cantidad-=1;
						conection.query('UPDATE inventario SET Medalla = ?  WHERE id = ?',[cantidad,data.id],function (error, results, fields) {});
						io.emit('DropObj', {success : true, objeto: data.objeto, pos:data.pos});
						break;

					case "Manzana":
							cantidad = results[0].Manzana;
							if (cantidad<=0) return;
							cantidad-=1;
							conection.query('UPDATE inventario SET Manzana = ?  WHERE id = ?',[cantidad,data.id],function (error, results, fields) {});
							io.emit('DropObj', {success : true, objeto: data.objeto, pos:data.pos});
							break;
				}
			}	
		});
	});


	socket.on('GetValuesInv',function(data){
		conection.query('SELECT * FROM inventario WHERE id = ?', [data.id], async (error,results2)=> {
			if(error) console.log(error);
			socket.emit('SetValuesInv', { valores:results2 }); // enviar los resultador al mismo cliente 
		});

	});
	
	socket.on('chat mensaje', function(data){ 
		console.log(`mensaje del chat: ${data.id} ${data.message}`); // imprimir mensaje en consola
		io.to(data.id).emit('chat mensaje', { id: socket.id, message: data.message });
	});



	// SOCKET.IO CHAT GLOBAL // 
	socket.on('join', ({ name, room }, callback) => {
		if (!isRealString(room)) {
		  return callback('El nombre de la sala es requerido.')
		}
	
		console.log(`${name} Se ha unido a la sala`)
	
		socket.join(room)
		users.removeUser(socket.id)
		const user = users.addUser(socket.id, name, room)
	
		console.log('Nuevo Usuario', user)
	
		io.to(room).emit('actualizar lista de usuarios', users.getUserList(room))
	
		socket.emit(
		  'newMessage',
		  generateMessage('Admin', 'Bienvenido a CUCEI VIRTUAL')
		)
	
		socket.broadcast
		  .to(room)
		  .emit('newMessage', generateMessage('Admin', `${name} se ha unido`))
	
		callback()
	})

	socket.on('createMessage', (msg, callback) => {
		const user = users.getUser(socket.id)
	
		if (user) {
		  console.log('createMessage', user)
		  const { room, name } = user
		  io.to(room).emit('newMessage', generateMessage(name, msg.text))
		}
	
		callback()
	  })
});


setInterval(function(){
	const nsp = io.of('/');
    let pack = [];
    for(let id in io.sockets.sockets){
        const socket = nsp.connected[id];
		//inserta solo los sockets que se han inicializado
		if (socket.userData.modelo!==undefined){
			pack.push({
				id: socket.id,
				modelo: socket.userData.modelo,
				color: socket.userData.color,
				atuendo: socket.userData.atuendo,
				x: socket.userData.x,
				y: socket.userData.y,
				z: socket.userData.z,
				heading: socket.userData.heading,
				pb: socket.userData.pb,
				action: socket.userData.action
			});   
		}
    }
	if (pack.length>0) io.emit('remoteData', pack);
}, 40); // 40 milesimas de segundo



