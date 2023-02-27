class Game{
	constructor(respawn,modelo,atuendo,color, id_usuario){
		if ( ! Detector.webgl ) Detector.addGetWebGLMessage();
		this.modes = Object.freeze({
			NONE:   Symbol("none"),
			PRELOAD: Symbol("preload"),
			INITIALISING:  Symbol("initialising"),
			CREATING_LEVEL: Symbol("creating_level"),
			ACTIVE: Symbol("active"),
			GAMEOVER: Symbol("gameover")
		});

		this.id_usuario = id_usuario;
		this.respawn = respawn;
		this.modelo = modelo;
		this.atuendo = atuendo;
		this.color = color;
		this.mode = this.modes.NONE;
		this.contenedor;
		this.jugador;
		this.camaras;
		this.camera;
		this.mapCamera, this.mapWidth = 240, this.mapHeight = 160;
		this.scene;
		this.renderer;
		this.animations = {};

		this.recolectables = [];
		this.recolectablesColliders = [];

		this.remotePlayers = [];
		this.remoteColliders = [];
		this.initialisingPlayers = [];
		this.remoteData = [];
		
		this.contenedor = document.createElement( 'div' );
		this.contenedor.style.height = '100%';
		document.body.appendChild( this.contenedor );
		
		const sfxExt = SFX.supportsAudioType('mp3') ? 'mp3' : 'ogg';
		
		const game = this;
		this.anims = ['Walking', 'Walking Backwards', 'Turn', 'Running'];

		const options = {
			assets:[
				`resources/images/nx.jpg`,
				`resources/images/px.jpg`,
				`resources/images/ny.jpg`,
				`resources/images/py.jpg`,
				`resources/images/nz.jpg`,
				`resources/images/pz.jpg`
			],
			oncomplete: function(){
				game.init();
			}
		}
		
		this.anims.forEach( function(anim){ options.assets.push(`resources/fbx/anims/${anim}.fbx`)});
		options.assets.push(`resources/fbx/B.fbx`);
		
		this.mode = this.modes.PRELOAD;
		this.clock = new THREE.Clock();
		const preloader = new Preloader(options);
		
		window.onError = function(error){
			console.error(JSON.stringify(error));
		}
	}


	
	set activeCamera(object){
		this.camaras.active = object;
	}
	
	init() {
		// CREAR ESCENA 
		this.scene = new THREE.Scene();
		this.mode = this.modes.INITIALISING;
		// CAMARA PRINCIPAL 
		this.camera = new THREE.PerspectiveCamera( 
			45,
			window.innerWidth / window.innerHeight,
			10,
			200000
		);
		this.scene.add(this.camera);

		// CAMARA MINIMAPA
		this.mapCamera = new THREE.PerspectiveCamera(
			90,
			window.innerWidth / window.innerHeight,
			1000,
			20000
		);
		this.mapCamera.up = new THREE.Vector3(0,0,-1);
		this.mapCamera.position.set(0,150,400);
		this.mapCamera.lookAt(this.scene.position);
		this.scene.add(this.mapCamera);

		// ESCENA 
		this.scene.background = new THREE.Color( 0x00a0f0 );
		const ambient = new THREE.AmbientLight( 0xaaaaaa );
        this.scene.add( ambient );
        const light = new THREE.DirectionalLight( 0xaaaaaa );
        light.position.set( 30, 100, 40 );
        light.target.position.set( 0, 0, 0 )
        light.castShadow = true;
		const lightSize = 500;
        light.shadow.camera.near = 1;
        light.shadow.camera.far = 500;
		light.shadow.camera.left = light.shadow.camera.bottom = -lightSize;
		light.shadow.camera.right = light.shadow.camera.top = lightSize;
        light.shadow.bias = 0.0039;
        light.shadow.mapSize.width = 1024;
        light.shadow.mapSize.height = 1024;
		this.sun = light;
		this.scene.add(light);

		// MAPA
		const loader = new THREE.FBXLoader();
		this.CargarMapa(loader);
		const game = this;
		this.jugador = new PlayerLocal(this);
		
		// RECOLECTABLES
		this.CargarRecolectables();

		// this.GetValoresInventario();

		// BURBUJA DE CHAT 
		this.speechBubble = new SpeechBubble(this, "", 150); // llamar a speechububble
		
		// JOYSTICK
		this.joystick = new JoyStick({
			onMove: this.controlJugador,
			game: this
		});
		
		// RENDER CONFIG 
		this.renderer = new THREE.WebGLRenderer( { antialias: true } );
		this.renderer.setPixelRatio( window.devicePixelRatio );
		this.renderer.setSize( window.innerWidth, window.innerHeight ); // especificando el tamaño de toda la pantalla
		this.renderer.shadowMap.enabled = true;
		this.contenedor.appendChild( this.renderer.domElement);
		this.renderer.autoClear = false;
		
		// EVENTO CLICK
		if ('ontouchstart' in window){
			window.addEventListener( 'touchdown', (event) => game.onMouseDown(event), false );
		}else{
			window.addEventListener( 'mousedown', (event) => game.onMouseDown(event), false );	
		}
		
		window.addEventListener( 'resize', () => game.onWindowResize(), false );
	}
	
	// CARGAR MAPA FUNC
	CargarMapa(loader){
		const game = this;
		loader.load(`resources/fbx/B.fbx`, function(object){
			game.environment = object;
			game.colliders = [];
			game.scene.add(object);
			object.traverse( function ( child ) {
				if ( child.isMesh ) {
					if (child.name.startsWith("")){ // cargar todos los elementos 
						game.colliders.push(child);
						child.material.visible = true;
					}else{
						child.castShadow = true;
						child.receiveShadow = true;
					}
				}
			} );
			// imagenes del cubo horizontes y cielo
			const tloader = new THREE.CubeTextureLoader();
			tloader.setPath( `resources/images/` );

			var textureCube = tloader.load( [
				'px.jpg', 'nx.jpg',
				'py.jpg', 'ny.jpg',
				'pz.jpg', 'nz.jpg'
			] );
			game.scene.background = textureCube;
			game.cargarSigAnimacion(loader);
		})
	}

	// CARGAR RECOLECTABLES
	CargarRecolectables(){
		const loader = new THREE.FBXLoader();
		const game = this;
		const material = new THREE.MeshBasicMaterial({wireframe:true, visible:false});

		const geometry_libro = new THREE.BoxGeometry(30,30,30);
		const geometry_botella = new THREE.BoxGeometry(200,200,200);


		
		const DirsLibros = [];
		var Dir1 = {X:-12495.2843,Y:70.47091,Z:23085};DirsLibros.push(Dir1);
		var Dir2 = {X:-2842.2843,Y:370.47091,Z:27381};DirsLibros.push(Dir2);
		var Dir3 = {X:2461,Y:70.47091,Z:33439};DirsLibros.push(Dir3);
		var Dir4 = {X:-9824.2843,Y:70.47091,Z:16576};DirsLibros.push(Dir4);
		var Dir5 = {X:-2261,Y:300,Z:6054};DirsLibros.push(Dir5);
		var Dir6 = {X:2570,Y:70.47091,Z:-918};DirsLibros.push(Dir6);
		var Dir7 = {X:10166,Y:70.47091,Z:-5254};DirsLibros.push(Dir7);
		var Dir8 = {X:-8115,Y:70.47091,Z:-6758};DirsLibros.push(Dir8);
		var Dir9 = {X:-12572,Y:70.47091,Z:-11204};DirsLibros.push(Dir9);
		var Dir10 = {X:1344,Y:70.47091,Z:-9124};DirsLibros.push(Dir10);

		for (let index = 0; index < DirsLibros.length; index++) {
			loader.load( `resources/fbx/recolectables/Libro.fbx`, function ( object ) {
				object.name = "libro";
				object.rotation.x = 190;
				object.position.set(DirsLibros[index].X,DirsLibros[index].Y,DirsLibros[index].Z);
				object.scale.set(5,5,5);
				const box = new THREE.Mesh(geometry_libro, material);
				box.name = "Collider";
				box.position.set(0, 8, 0);
				object.add(box);
				object.collider = box;
				game.scene.add(object);
				game.recolectablesColliders.push(object.collider);
				game.recolectables.push(object);
			});
		}


		const DirsBotellas = [];
		Dir1 = {X:-11122,Y:70.47091,Z:30520};DirsBotellas.push(Dir1);
		Dir2 = {X:-9335.2843,Y:70.47091,Z:21531};DirsBotellas.push(Dir2);
		Dir3 = {X:-2770,Y:70.47091,Z:29268};DirsBotellas.push(Dir3);
		Dir4 = {X:4841,Y:70.47091,Z:16550};DirsBotellas.push(Dir4);
		Dir5 = {X:-9332,Y:70,Z:5048};DirsBotellas.push(Dir5);
		Dir6 = {X:-15811,Y:70.47091,Z:2677};DirsBotellas.push(Dir6);
		Dir7 = {X:-16523,Y:70.47091,Z:-4311};DirsBotellas.push(Dir7);
		Dir8 = {X:-11382,Y:70.47091,Z:-7729};DirsBotellas.push(Dir8);
		Dir9 = {X:4199,Y:70.47091,Z:-5338};DirsBotellas.push(Dir9);
		Dir10 = {X:8578,Y:70.47091,Z:4295};DirsBotellas.push(Dir10);

		for (let index = 0; index < DirsBotellas.length; index++) {
			loader.load( `resources/fbx/recolectables/Botella.fbx`, function ( object ) {
				object.name = "Botella";
				object.position.set(DirsBotellas[index].X,DirsBotellas[index].Y,DirsBotellas[index].Z);
				object.scale.set(.5,.5,.5);
				const box = new THREE.Mesh(geometry_botella, material);
				box.name = "Collider";
				box.position.set(0, 8, 0);
				object.add(box);
				object.collider = box;
				game.scene.add(object);
				game.recolectablesColliders.push(object.collider);
				game.recolectables.push(object);
			});
		}


		const DirsBalon = [];
		Dir1 = {X:-2354,Y:70.47091,Z:34654};DirsBalon.push(Dir1);
		Dir2 = {X:-6920.2843,Y:70.47091,Z:25440};DirsBalon.push(Dir2);
		Dir3 = {X:-11358,Y:70.47091,Z:17281};DirsBalon.push(Dir3);
		Dir4 = {X:-11715,Y:70.47091,Z:3415};DirsBalon.push(Dir4);
		Dir5 = {X:-16240,Y:70,Z:-8928};DirsBalon.push(Dir5);
		Dir6 = {X:13652,Y:70.47091,Z:12082};DirsBalon.push(Dir6);
		Dir7 = {X:10600,Y:70.47091,Z:-7272};DirsBalon.push(Dir7);
		Dir8 = {X:940,Y:70.47091,Z:-6926};DirsBalon.push(Dir8);
		Dir9 = {X:-91,Y:70.47091,Z:6068};DirsBalon.push(Dir9);
		Dir10 = {X:5059,Y:70.47091,Z:-268};DirsBalon.push(Dir10);

		for (let index = 0; index < DirsBalon.length; index++) {
			loader.load( `resources/fbx/recolectables/Balon.fbx`, function ( object ) {
				object.name = "Balon";
				object.position.set(DirsBalon[index].X,DirsBalon[index].Y,DirsBalon[index].Z);
				object.scale.set(.5,.5,.5);
				const box = new THREE.Mesh(geometry_botella, material);
				box.name = "Collider";
				box.position.set(0, 8, 0);
				object.add(box);
				object.collider = box;
				game.scene.add(object);
				game.recolectablesColliders.push(object.collider);
				game.recolectables.push(object);
			});
		}

		const DirsLaptop = [];
		Dir1 = {X:8870,Y:70.47091,Z:10739};DirsLaptop.push(Dir1);
		Dir2 = {X:2414.2843,Y:70.47091,Z:29281};DirsLaptop.push(Dir2);
		Dir3 = {X:-8518,Y:70.47091,Z:34866};DirsLaptop.push(Dir3);
		Dir4 = {X:-9352,Y:70.47091,Z:13639};DirsLaptop.push(Dir4);
		Dir5 = {X:-22581,Y:70,Z:581};DirsLaptop.push(Dir5);
		Dir6 = {X:-6687,Y:70.47091,Z:-10015};DirsLaptop.push(Dir6);
		Dir7 = {X:2258,Y:70.47091,Z:-3359};DirsLaptop.push(Dir7);
		Dir8 = {X:-4830,Y:100.47091,Z:274};DirsLaptop.push(Dir8);
		Dir9 = {X:-4916,Y:70.47091,Z:11711};DirsLaptop.push(Dir9);
		Dir10 = {X:3474,Y:70.47091,Z:7784};DirsLaptop.push(Dir10);

		for (let index = 0; index < DirsLaptop.length; index++) {
			loader.load( `resources/fbx/recolectables/Laptop.fbx`, function ( object ) {
				object.name = "Laptop";
				object.position.set(DirsLaptop[index].X,DirsLaptop[index].Y,DirsLaptop[index].Z);
				object.scale.set(.5,.5,.5);
				const box = new THREE.Mesh(geometry_botella, material);
				box.name = "Collider";
				box.position.set(0, 8, 0);
				object.add(box);
				object.collider = box;
				game.scene.add(object);
				game.recolectablesColliders.push(object.collider);
				game.recolectables.push(object);
			});
		}


		const DirsManzana = [];
		Dir1 = {X:-6867,Y:70,Z:31995};DirsManzana.push(Dir1);
		Dir2 = {X:-5673,Y:70,Z:20633};DirsManzana.push(Dir2);
		Dir3 = {X:-2516,Y:70,Z:23327};DirsManzana.push(Dir3);
		Dir4 = {X:-1716,Y:70,Z:16611};DirsManzana.push(Dir4);
		Dir5 = {X:1474,Y:70,Z:10333};DirsManzana.push(Dir5);
		Dir6 = {X:-6710,Y:70,Z:3040};DirsManzana.push(Dir6);
		Dir7 = {X:-3054,Y:70,Z:-10948};DirsManzana.push(Dir7);
		Dir8 = {X:4775,Y:70,Z:485};DirsManzana.push(Dir8);
		Dir9 = {X:-24368,Y:70,Z:-1105};DirsManzana.push(Dir9);
		Dir10 = {X:-8089,Y:70,Z:-2341};DirsManzana.push(Dir10);

		for (let index = 0; index < DirsManzana.length; index++) {
			loader.load( `resources/fbx/recolectables/Manzana.fbx`, function ( object ) {
				object.name = "Manzana";
				object.position.set(DirsManzana[index].X,DirsManzana[index].Y,DirsManzana[index].Z);
				object.scale.set(.5,.5,.5);
				const box = new THREE.Mesh(geometry_botella, material);
				box.name = "Collider";
				box.position.set(0, 8, 0);
				object.add(box);
				object.collider = box;
				game.scene.add(object);
				game.recolectablesColliders.push(object.collider);
				game.recolectables.push(object);
			});
		}

		loader.load( `resources/fbx/recolectables/Medalla.fbx`, function ( object ) {
			object.name = "Medalla";
			object.rotation.x = 190;
			object.position.set(-15047.98,1300,1914.1);
			object.scale.set(.5,.5,.5);

			const box = new THREE.Mesh(geometry_botella, material);
			box.name = "Collider";
			box.position.set(0, 8, 0);
			object.add(box);
			object.collider = box;

			game.scene.add(object);
			game.recolectablesColliders.push(object.collider);
			game.recolectables.push(object);

		});
	}

	GetValoresInventario(){
		if(this.id_usuario != ''){
			this.jugador.socket.emit('GetValuesInv', { 
				id:this.id_usuario,
			});
			this.jugador.socket.on('SetValuesInv',function(data){ // recibo los valores del inventario desde la BD
				document.getElementById('libro').innerHTML = data.valores[0].libro;
				document.getElementById('Botella').innerHTML = data.valores[0].Botella;
				document.getElementById('Laptop').innerHTML = data.valores[0].Laptop;
				document.getElementById('Balon').innerHTML = data.valores[0].Balon;
				document.getElementById('Manzana').innerHTML = data.valores[0].Manzana;
				document.getElementById('Medalla').innerHTML = data.valores[0].Medalla;

				// misiones
				var x;
				document.getElementById('countLibros').innerHTML = `${data.valores[0].libro} /10`;
				x= data.valores[0].libro * 10;
				document.getElementById('colorlibros').style.width = `${x}%`;

				document.getElementById('countBotellas').innerHTML = `${data.valores[0].Botella} /10`;
				x= data.valores[0].Botella * 10;
				document.getElementById('colorBotellas').style.width = `${x}%`;

				document.getElementById('countLaptop').innerHTML = `${data.valores[0].Laptop} /10`;
				x= data.valores[0].Laptop * 10;
				document.getElementById('colorLaptops').style.width = `${x}%`;

				document.getElementById('countBalones').innerHTML = `${data.valores[0].Balon} /10`;
				x= data.valores[0].Balon * 10;
				document.getElementById('colorBalon').style.width = `${x}%`;

				document.getElementById('countManzanas').innerHTML = `${data.valores[0].Manzana} /10`;
				x= data.valores[0].Manzana * 10;
				document.getElementById('colorManzanas').style.width = `${x}%`;

				document.getElementById('countMedalla').innerHTML = `${data.valores[0].Medalla} /1`;
				x= data.valores[0].Medalla * 100;
				document.getElementById('colorMedalla').style.width = `${x}%`;



			});
		}
	}

	DropInventario(name){
		const game = this;
		const swalWithBootstrapButtons = Swal.mixin({
			customClass: {
			  confirmButton: 'btn btn-success',
			  cancelButton: 'btn btn-danger'
			},
			buttonsStyling: true
		});
		  
		swalWithBootstrapButtons.fire({
			title: '¿Deseas arrojar este objeto? ',
			icon: 'warning',
			showCancelButton: true,
			confirmButtonText: 'Si,  Suéltalo !',
			cancelButtonText: 'No, Me lo quedo  !',
			reverseButtons: true
		}).then((result) => {
			var x=0;
			if (result.isConfirmed ) {
				game.jugador.socket.emit('recolectable', { 
					id:game.id_usuario,
					objeto: name,
					accion:2, // arrojar
					pos : game.jugador.object.position //  enviar la posicion del jugador
				});
			}
			else if(result.dismiss === Swal.DismissReason.cancel){
				swalWithBootstrapButtons.fire(
					'Cancelado',
					'Tu objeto esta a salvo :)',
				);
			}
		});
	};

	// CARGAR ANIMACIONES
	cargarSigAnimacion(loader){
		let anim = this.anims.pop();
		const game = this;
		loader.load( `resources/fbx/anims/${anim}.fbx`, function( object ){
			game.jugador.animations[anim] = object.animations[0];
			if (game.anims.length>0){
				game.cargarSigAnimacion(loader);
			}else{
				delete game.anims;
				game.action = "Idle";
				game.mode = game.modes.ACTIVE;
				game.animar();
			}
		});	
	}
	

	// CONTROL JUGADOR
	controlJugador(forward, turn){
		turn = -turn;
		if (forward>0.3){
			if (this.jugador.action!='Walking' && this.jugador.action!='Running') this.jugador.action = 'Walking';
		}else if (forward<-0.3){
			if (this.jugador.action!='Walking Backwards') this.jugador.action = 'Walking Backwards';
		}else{
			forward = 0;
			if (Math.abs(turn)>0.1){
				if (this.jugador.action != 'Turn') this.jugador.action = 'Turn';
			}else if (this.jugador.action!="Idle"){
				this.jugador.action = 'Idle';
			}
		}
		if (forward==0 && turn==0){
			delete this.jugador.motion;
		}else{
			this.jugador.motion = { forward, turn }; 
		}
		
		this.jugador.updateSocket();
	}
	
	// ARREGLO CAMARAS (PERSONAJE)
	createCameras(){  
		const offset = new THREE.Vector3(0, 80, 0);
		const front = new THREE.Object3D();
		front.position.set(112, 100, 600);
		front.parent = this.jugador.object;
		const back = new THREE.Object3D();
		back.position.set(0, 300, -1050);
		back.parent = this.jugador.object;
		const chat = new THREE.Object3D();
		chat.position.set(0, 200, -450);
		chat.parent = this.jugador.object;
		const wide = new THREE.Object3D();
		wide.position.set(178, 139, 1665);
		wide.parent = this.jugador.object;
		const overhead = new THREE.Object3D();
		overhead.position.set(0, 400, 0);
		overhead.parent = this.jugador.object;
		const collect = new THREE.Object3D();
		collect.position.set(40, 82, 94);
		collect.parent = this.jugador.object;
		this.camaras = { front, back, wide, overhead, collect, chat };
		this.activeCamera = this.camaras.back;	
	}
	
	// MENSAJE BBURBUJA
	showMessage(msg, fontSize=20, onOK=null){
		const txt = document.getElementById('message_text'); // optenemos el elemento con el id 'message_text'
		txt.innerHTML = msg;
		txt.style.fontSize = fontSize + 'px';
		const btn = document.getElementById('message_ok');
		const panel = document.getElementById('message');
		const game = this;
		if (onOK!=null){
			btn.onclick = function(){ 
				panel.style.display = 'none';
				onOK.call(game); 
			}
		}else{
			btn.onclick = function(){
				panel.style.display = 'none';
			}
		}
		panel.style.display = 'flex';
	}
	

	// EVENTO
	onWindowResize() {
		this.camera.aspect = window.innerWidth / window.innerHeight;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize( window.innerWidth, window.innerHeight );
	}
	

	// ACTUALIZAR JUGADORES REMOTOS
	ActualizarJugadores(dt){ // actualizar jugadores remotos 
		if (this.remoteData===undefined || this.remoteData.length == 0 || this.jugador===undefined || this.jugador.id===undefined) return;
		
		const newPlayers = [];
		const game = this;
		//obtener todos los jugadores remotos desde el arreglo remotedata
		const remotePlayers = [];
		const remoteColliders = [];
		
		this.remoteData.forEach( function(data){
			if (game.jugador.id != data.id){ // verificar que sea diferente de nuestro jugador
				//el jugador esta incializado?
				let iplayer;
				game.initialisingPlayers.forEach( function(jugador){
					if (jugador.id == data.id) iplayer = jugador;
				});
				//si no esta inicializando , revisar el arreglo de remotePlayers
				if (iplayer===undefined){
					let rplayer;
					game.remotePlayers.forEach( function(jugador){
						if (jugador.id == data.id) rplayer = jugador;
					});
					if (rplayer===undefined){
						//inicializar jugador remoto
						game.initialisingPlayers.push( new Player( game, data ));
					}else{
						//EL jugador si existe 
						remotePlayers.push(rplayer);
						remoteColliders.push(rplayer.collider);
					}
				}
			}
		});
		
		this.scene.children.forEach( function(object){
			if (object.userData.remotePlayer && game.obtenerJugadoresPorID(object.userData.id)==undefined){
				game.scene.remove(object);
			}	
		});
		
		this.remotePlayers = remotePlayers;
		this.remoteColliders = remoteColliders;
		this.remotePlayers.forEach(function(jugador){ jugador.update( dt ); });	
	}

	// EVENTO CLIC
	onMouseDown( event ) {		
		// calcular la posición del mouse en coordenadas normalizadas del dispositivo
		// (-1 a +1) para ambos componentes
		const game =this;
		const mouse = new THREE.Vector2();
		mouse.x = ( event.clientX / this.renderer.domElement.clientWidth ) * 2 - 1;
		mouse.y = - ( event.clientY / this.renderer.domElement.clientHeight ) * 2 + 1;

		const raycaster = new THREE.Raycaster();
		raycaster.setFromCamera( mouse, this.camera );
		const intersects = raycaster.intersectObjects( this.remoteColliders );

		const chat = document.getElementById('chat-in-game');
		
		
		if (intersects.length>0){
			const object = intersects[0].object;

			const players = this.remotePlayers.filter( function(jugador){
				if (jugador.collider!==undefined && jugador.collider==object){
					return true;
				}
			});
			// si es un jugador
			if (players.length>0){
				const jugador = players[0];
				console.log(`onMouseDown: jugador ${jugador.id}`);
				this.speechBubble.jugador = jugador;
				this.speechBubble.update('');
				this.scene.add(this.speechBubble.mesh);
				this.chatSocketId = jugador.id;
				chat.style.bottom = '0px';
				this.activeCamera = this.camaras.chat;
			}
		}else{
			//Se puede ver el panel del chat?
			if (chat.style.bottom=='0px' && (window.innerHeight - event.clientY)>40){
				console.log("onMouseDown: No jugador found");
				if (this.speechBubble.mesh.parent!==null) this.speechBubble.mesh.parent.remove(this.speechBubble.mesh);
				delete this.speechBubble.jugador;
				delete this.chatSocketId;
				chat.style.bottom = '-50px';
				this.activeCamera = this.camaras.back;
			}
		}


		const raycasterRecolectables = new THREE.Raycaster();
		raycasterRecolectables.setFromCamera( mouse, this.camera );
		const intersectsRecolectables = raycaster.intersectObjects( this.recolectablesColliders );

		if (intersectsRecolectables.length>0){
			const object = intersectsRecolectables[0].object;

			const recolectables = game.recolectables.filter( function(recolectable){
				if (recolectable.collider!==undefined && recolectable.collider==object){
					return true;
				}
			});

			if (recolectables.length>0){
				console.log("Recogiste un: " + recolectables[0].name); // objeto

				var index =  game.recolectablesColliders.indexOf(object);
				// console.log("El indice del colider en el arreglo es "+ index);
				game.recolectablesColliders.splice(index,1);// remover collider de mi arreglo

				
				var index2 =  game.recolectables.indexOf(recolectables[0]);
				// console.log("El indice del objeto en el arreglo es "+ index2);
				game.recolectables.splice(index2,1); // remover objeto de mi arreglo


				game.scene.remove(recolectables[0]); // remover objeto del mapa

				if(this.id_usuario==''){
					// El usuario es un invitado y no se hace consulta a la base de datos de recolectables
					return;
				}
				else{
					// el usuario esta registrado en la base de datos y se puede hacer el insert en la DB
					this.jugador.socket.emit('recolectable', { 
						id:this.id_usuario,
						objeto:recolectables[0].name,
						accion:1 // recolectar
					});
					// Actualizar el div de progreso de misiones
				}
				game.GetValoresInventario();	// actualizar div de inventario

			}
		}
	}
	
	//OBTENER JUGADORES POR ID
	obtenerJugadoresPorID(id){ // obtener jugadores remotos
		if (this.remotePlayers===undefined || this.remotePlayers.length==0) return;
		const players = this.remotePlayers.filter(function(jugador){
			if (jugador.id == id) return true;
		});	
		
		if (players.length==0) return;
		return players[0];
	}
	
	// ANIMAR
	animar() {
		const game = this;
		const dt = this.clock.getDelta();
		var w = window.innerWidth, h = window.innerHeight;
		
		requestAnimationFrame( function(){ game.animar(); } );
		
		this.ActualizarJugadores(dt);
		
		if (this.jugador.mixer!=undefined && this.mode==this.modes.ACTIVE) this.jugador.mixer.update(dt);
		
		if (this.jugador.action=='Walking'){
			const elapsedTime = Date.now() - this.jugador.actionTime;
			if (elapsedTime>1000 && this.jugador.motion.forward>0){
				this.jugador.action = 'Running';
			}
		}
		
		if (this.jugador.motion !== undefined) this.jugador.move(dt);
		
		if (this.camaras!=undefined && this.camaras.active!=undefined && this.jugador!==undefined && this.jugador.object!==undefined){
			this.camera.position.lerp(this.camaras.active.getWorldPosition(new THREE.Vector3()), 0.05);
			const pos = this.jugador.object.position.clone();
			if (this.camaras.active==this.camaras.chat){
				pos.y += 200;
			}else{
				pos.y += 300;
			}
			this.camera.lookAt(pos);
		}
		
		if (this.sun !== undefined){
			this.sun.position.copy( this.camera.position );
			this.sun.position.y += 10;
		}
		
		if (this.speechBubble!==undefined) this.speechBubble.show(this.camera.position);

		// PRIMER RENDER (PERSONAJE)
		this.renderer.setViewport( 0, 0, w, h );
		this.renderer.clear();
		this.renderer.render( this.scene, this.camera ); // renderizar vista de jugador


		// SEGUNDO RENDER (MINIMAPA)
		var relativeCameraOffset = new THREE.Vector3(0,5000,0);
		var cameraOffset = relativeCameraOffset.applyMatrix4( this.jugador.object.matrixWorld );
		this.mapCamera.position.x = cameraOffset.x;
		this.mapCamera.position.y = cameraOffset.y;
		this.mapCamera.position.z = cameraOffset.z;
		this.mapCamera.lookAt( this.jugador.object.position);
		this.renderer.setViewport( 20, h - 200, this.mapWidth, this.mapHeight );
		this.renderer.render( this.scene, this.mapCamera ); // renderizar minimapa

		// ANIMACION RECOLECTABLES
		for (let index = 0; index < this.recolectables.length; index++) {
			this.recolectables[index].rotation.z += 0.02;
			this.recolectables[index].rotation.x += 0.001;
		}

/* 		this.libros.object.rotation.z += 0.02;
		this.libros.object.rotation.x += 0.001; */


	}
}

class Player{ // Clase jugador Base
	constructor(game, options){
		this.local = true;

		// si opciones es un objeto quiere decir que es un jugador remoto					
		if (typeof options =='object'){
			// console.log("Si me llego el paquete " + Object.values(options));
			game.modelo = options.modelo,
			game.color = options.color,
			game.atuendo = options.atuendo,
			this.local = false;
			this.options = options;
			this.id = options.id;
		}

		this.game = game;
		this.animations = this.game.animations;
		
		const loader = new THREE.FBXLoader();
		const jugador = this;
		loader.load( `resources/fbx/people/${game.modelo}.fbx`, function ( object ) { // cargar fbx jugador

			object.mixer = new THREE.AnimationMixer( object );
			jugador.root = object;
			jugador.mixer = object.mixer;
			
			object.name = "Persona";
					
			object.traverse( function ( child ) {
				if ( child.isMesh ) {
					child.castShadow = true;
					child.receiveShadow = true;		
				}
			} );
			
			
			const textureLoader = new THREE.TextureLoader();
			
			textureLoader.load(`resources/images/${game.atuendo}_${game.color}.png`, function(texture){ // cargar la textura
				object.traverse( function ( child ) {
					if ( child.isMesh ){
						child.material.map = texture;
					}
				} );
			});
			
			jugador.object = new THREE.Object3D();
			jugador.object.rotation.set(0, 2.6, 0);

////////////////////////////////////////////////
			
			jugador.object.add(object);
			if (jugador.deleted===undefined) game.scene.add(jugador.object);
			
			if (jugador.local){
				game.createCameras();
				game.sun.target = game.jugador.object;
				game.animations.Idle = object.animations[0];
				if (jugador.initSocket!==undefined) jugador.initSocket();
							// Configurar coordenadas iniciales personaje y camara
				switch(game.respawn){
					case 'A': // revolucion
						game.camera.position.set(14000, -60, -3300);  // posicion inicial de la camara principal
						jugador.object.position.set(13284.454, -58.4778, -3439.059); // posicion inicial del jugador
					break;
					case 'B': // bvulevard 
						game.camera.position.set(-10900, -60, 34000); 
						jugador.object.position.set(-9924.43700, -58.47073647, 31753.20072);
					break;
					case 'C': // aud matute remus 
						game.camera.position.set(-1300, 40, 11000); 
						jugador.object.position.set(-1241.77660, -35.644, 9673.82); 
					break;
				}
			}else{
				const geometry = new THREE.BoxGeometry(100,300,100);
				const material = new THREE.MeshBasicMaterial({visible:false});
				const box = new THREE.Mesh(geometry, material);
				box.name = "Collider";
				box.position.set(0, 150, 0);
				jugador.object.add(box);
				jugador.collider = box;
				jugador.object.userData.id = jugador.id;
				jugador.object.userData.remotePlayer = true;
				const players = game.initialisingPlayers.splice(game.initialisingPlayers.indexOf(this), 1);
				game.remotePlayers.push(players[0]);
			}
			
			if (game.animations.Idle!==undefined) jugador.action = "Idle";

		} );
	}
	
	set action(name){
		//si la accion recibida ya se esta ejucutando regresar
		if (this.actionName == name) return;
		const clip = (this.local) ? this.animations[name] : THREE.AnimationClip.parse(THREE.AnimationClip.toJSON(this.animations[name])); 
		const action = this.mixer.clipAction( clip );
        action.time = 0;
		this.mixer.stopAllAction();
		this.actionName = name;
		this.actionTime = Date.now();
		
		action.fadeIn(0.5);	
		action.play();
	}
	
	get action(){
		return this.actionName;
	}
	
	update(dt){
		this.mixer.update(dt);
		
		if (this.game.remoteData.length>0){
			let found = false;
			for(let data of this.game.remoteData){
				if (data.id != this.id) continue;
				//Encontrar al jugador
				this.object.position.set( data.x, data.y, data.z );
				const euler = new THREE.Euler(data.pb, data.heading, data.pb);
				this.object.quaternion.setFromEuler( euler );
				this.action = data.action;
				found = true;
			}
			if (!found) this.game.removePlayer(this);
		}
	}
}

class PlayerLocal extends Player{ // Clase jugador local
	constructor(game, model){
		super(game, model);
		
		const jugador = this;
		const socket = io.connect();
		socket.on('setId', function(data){ // recibe la data desde el servidor
			jugador.id = data.id;
		});
		socket.on('remoteData', function(data){ // paquete de data que contiene la informacion de todos los sockets conectados
			game.remoteData = data;
		});
		socket.on('EliminarJugador', function(data){ // metodo eliminar jugador
			const players = game.remotePlayers.filter(function(jugador){ // buscar al jugador local en el server
				if (jugador.id == data.id){
					return jugador;
				}
			});
			if (players.length>0){
				let index = game.remotePlayers.indexOf(players[0]); // visualizarlo en el arreglo remoteplayers
				if (index!=-1){ // si si lo encontro
					game.remotePlayers.splice( index, 1 ); // remover al jugador del arreglo
					game.scene.remove(players[0].object); // remover al jugador de la escena
				}
            }else{ // si no lo encontramos , puede que este en los jugadores inicializados
                let index = game.initialisingPlayers.indexOf(data.id);
                if (index!=-1){
                    const jugador = game.initialisingPlayers[index];
                    jugador.deleted = true;
                    game.initialisingPlayers.splice(index, 1);
                }
			}
		});
        
		socket.on('chat mensaje', function(data){
			document.getElementById('chat-in-game').style.bottom = '0px';
			const jugador = game.obtenerJugadoresPorID(data.id);
			game.speechBubble.jugador = jugador;
			game.chatSocketId = jugador.id;
			game.activeCamera = game.camaras.chat;
			game.speechBubble.update(data.message);
		});
        
		$('#msg-form').submit(function(e){
			socket.emit('chat mensaje', { id:game.chatSocketId, message:$('#m').val() });
			$('#m').val('');
			return false;
		});

		socket.on('DropObj',function(data){ // recibo los valores del inventario desde la BD 
			console.log("si recibi el emit");
			if (data.success === true) {
				const pos = data.pos;				// obtener la pos del jugador

				var loader = new THREE.FBXLoader();
				var material = new THREE.MeshBasicMaterial({wireframe:true, visible:false});
				var geometry_libro = new THREE.BoxGeometry(30,30,30);
				var geometry_botella = new THREE.BoxGeometry(200,200,200);

				if (data.objeto == "libro") {
					loader.load( `resources/fbx/recolectables/${data.objeto}.fbx`, function ( object ) {
						object.name = `${data.objeto}`;
						var num =  Math.round(Math.random() * (600 -300) + 300);
						object.position.set(pos.x+num,70,pos.z); ////////////////7
						object.rotation.x = 190;
						object.scale.set(5,5,5);
						var box = new THREE.Mesh(geometry_libro, material);
						box.name = "Collider";
						box.position.set(0, 8, 0);
						object.add(box);
						object.collider = box;
						game.scene.add(object);
						game.recolectablesColliders.push(object.collider);
						game.recolectables.push(object);
					});

				}
				else if (data.objeto!=libro){
					loader.load( `resources/fbx/recolectables/${data.objeto}.fbx`, function ( object ) {
						object.name = `${data.objeto}`;
						object.scale.set(.5,.5,.5);
						var num =  Math.round(Math.random() * (600 -300) + 300);
						object.position.set(pos.x+num,70,pos.z);
						var box = new THREE.Mesh(geometry_botella, material);
						box.name = "Collider";
						box.position.set(0, 8, 0);
						object.add(box);
						object.collider = box;
						game.scene.add(object);
						game.recolectablesColliders.push(object.collider);
						game.recolectables.push(object);
					});
				}
				game.GetValoresInventario();	
			}
		});
		
		this.socket = socket;
	}
	
	initSocket(){ // Enviar la data del personaje local al servidor 
		this.socket.emit('init', { 
			modelo:game.modelo, 
			color: game.color,
			atuendo: game.atuendo,
			x: this.object.position.x,
			y: this.object.position.y,
			z: this.object.position.z,
			h: this.object.rotation.y,
			pb: this.object.rotation.x
		});
	}
	
	updateSocket(){
		// actuliza la posicion del jugador y la animacion 
		if (this.socket !== undefined){
			//console.log(`PlayerLocal.updateSocket - rotation(${this.object.rotation.x.toFixed(1)},${this.object.rotation.y.toFixed(1)},${this.object.rotation.z.toFixed(1)})`);
			this.socket.emit('update', {
				x: this.object.position.x,
				y: this.object.position.y,
				z: this.object.position.z,
				h: this.object.rotation.y,
				pb: this.object.rotation.x,
				action: this.action
			})
		}
	}
	
	move(dt){
		const pos = this.object.position.clone();
		pos.y += 60;
		let dir = new THREE.Vector3();
		this.object.getWorldDirection(dir);
		if (this.motion.forward<0) dir.negate();
		let raycaster = new THREE.Raycaster(pos, dir);
		let blocked = false;
		const colliders = this.game.colliders;
	
		if (colliders!==undefined){ 
			const intersect = raycaster.intersectObjects(colliders);
			if (intersect.length>0){
				if (intersect[0].distance<50) blocked = true;
			}
		}
		
		if (!blocked){
			if (this.motion.forward>0){
				const speed = (this.action=='Running') ? 1500 : 150; // 1000- 150
				this.object.translateZ(dt*speed);
			}else{
				this.object.translateZ(-dt*300); // 300
			}
		}
		
		if (colliders!==undefined){
			//comprobar left
			dir.set(-1,0,0);
			dir.applyMatrix4(this.object.matrix);
			dir.normalize();
			raycaster = new THREE.Raycaster(pos, dir);

			let intersect = raycaster.intersectObjects(colliders);
			if (intersect.length>0){
				if (intersect[0].distance<50) this.object.translateX(100-intersect[0].distance);
			}
			
			//comprobar right
			dir.set(1,0,0);
			dir.applyMatrix4(this.object.matrix);
			dir.normalize();
			raycaster = new THREE.Raycaster(pos, dir);

			intersect = raycaster.intersectObjects(colliders);
			if (intersect.length>0){
				if (intersect[0].distance<50) this.object.translateX(intersect[0].distance-100);
			}
			
			//comprobar down
			dir.set(0,-1,0);
			pos.y += 200;
			raycaster = new THREE.Raycaster(pos, dir);
			const gravity = 30;

			intersect = raycaster.intersectObjects(colliders);
			if (intersect.length>0){
				const targetY = pos.y - intersect[0].distance;
				if (targetY > this.object.position.y){
					//subir
					this.object.position.y = 0.8 * this.object.position.y + 0.2 * targetY;
					this.velocityY = 0;
				}else if (targetY < this.object.position.y){
					//caer
					if (this.velocityY==undefined) this.velocityY = 0;
					this.velocityY += dt * gravity;
					this.object.position.y -= this.velocityY;
					if (this.object.position.y < targetY){
						this.velocityY = 0;
						this.object.position.y = targetY;
					}
				}
			}
		}
		
		this.object.rotateY(this.motion.turn*dt);
		
		this.updateSocket();
	}
}

function restartEngine(parameters) // fuegos artificiales
{	
	engine.destroy();
	engine = new ParticleEngine();
	engine.setValues( parameters );
	engine.initialize();
}

// CLASE BURBUJA DE CHAT 
class SpeechBubble{
	constructor(game, msg, size=1){
		this.config = { font:'Calibri', size:24, padding:10, colour:'#222', width:256, height:256 };
		
		const planeGeometry = new THREE.PlaneGeometry(size, size);
		const planeMaterial = new THREE.MeshBasicMaterial()
		this.mesh = new THREE.Mesh(planeGeometry, planeMaterial);
		this.mesh.position.set(-1000,10000,-100000)
		game.scene.add(this.mesh);
		
		const self = this;
		const loader = new THREE.TextureLoader();
		loader.load(
			// direccion burbuja
			`resources/images/speech.png`, 

			// al llamar la funcion
			function ( texture ) {
				// crear el material cuando se carga la textura
				self.img = texture.image;
				self.mesh.material.map = texture;
				self.mesh.material.transparent = true;
				self.mesh.material.needsUpdate = true;
				if (msg!==undefined) self.update(msg);
			},

			// devolucion de la llamada en progreso indefinido
			undefined,

			//devolucion de error 
			function ( err ) {
				console.error( 'Ha ocurrido un error con el spech bubble.' );
			}
		);
	}
	
	update(msg){
		if (this.mesh===undefined) return;
		
		let context = this.context;
		
		if (this.mesh.userData.context===undefined){
			const canvas = this.createOffscreenCanvas(this.config.width, this.config.height);
			this.context = canvas.getContext('2d');
			context = this.context;
			context.font = `${this.config.size}pt ${this.config.font}`;
			context.fillStyle = this.config.colour;
			context.textAlign = 'center';
			this.mesh.material.map = new THREE.CanvasTexture(canvas);
		}
		
		const bg = this.img;
		context.clearRect(0, 0, this.config.width, this.config.height);
		context.drawImage(bg, 0, 0, bg.width, bg.height, 0, 0, this.config.width, this.config.height);
		this.wrapText(msg, context);
		
		this.mesh.material.map.needsUpdate = true;
	}
	
	createOffscreenCanvas(w, h) {
		const canvas = document.createElement('canvas');
		canvas.width = w;
		canvas.height = h;
		return canvas;
	}
	
	wrapText(text, context){
		const words = text.split(' ');
        let line = '';
		const lines = [];
		const maxWidth = this.config.width - 2*this.config.padding;
		const lineHeight = this.config.size + 8;
		
		words.forEach( function(word){
			const testLine = `${line}${word} `;
        	const metrics = context.measureText(testLine);
        	const testWidth = metrics.width;
			if (testWidth > maxWidth) {
				lines.push(line);
				line = `${word} `;
			}else {
				line = testLine;
			}
		});
		
		if (line != '') lines.push(line);
		
		let y = (this.config.height - lines.length * lineHeight)/2;
		
		lines.forEach( function(line){
			context.fillText(line, 128, y);
			y += lineHeight;
		});
	}
	
	show(pos){
		if (this.mesh!==undefined && this.jugador!==undefined){
			this.mesh.position.set(this.jugador.object.position.x, this.jugador.object.position.y + 400, this.jugador.object.position.z);
			this.mesh.lookAt(pos);
		}
	}
}