
class Mapa{
	constructor(){
		if ( ! Detector.webgl ) Detector.addGetWebGLMessage();
		
		this.container;
		this.controls;
		this.camera;
		this.scene;
		this.renderer;
		this.remoteColliders = []; // 
		this.targetList = [];	//

		this.sprite1;
		this.canvas1; this.context1; this.texture1;

		this.spriteMaterial;
		this.mouse = new THREE.Vector2();
		this.INTERSECTED;


		this.container = document.getElementById('HelpShowMap');
		this.container2 = document.getElementById('Div_mapa');
		this.container.appendChild(this.container2);
		document.body.appendChild( this.container );

		this.MapWidth = this.container2.offsetWidth;
		this.MapHeight = this.container2.offsetHeight;
		// console.log(this.MapHeight);
		// console.log(this.MapWidth);

		const Mapa = this;
				
		this.clock = new THREE.Clock();
        
        this.init();

		window.onError = function(error){
			console.error(JSON.stringify(error));
		}
	}


	
	init() {
		// camara
		this.camera = new THREE.PerspectiveCamera( 60, this.MapWidth / this.MapHeight, 1000, 200000 );
		this.camera.position.set(23000, 13000, 8000);
        this.camera.lookAt( 0, 0, 0 );
		this.scene = new THREE.Scene();
		
		// iluminacion
        let ambient = new THREE.AmbientLight(0xa0a0a0);
		let light = new THREE.HemisphereLight( 0xdddddd, 0x444444 );
		light.position.set( 0, 200, 0 );
		this.scene.add( light );

		const Mapa = this;
		
		// Cargar Mapa
		const loader = new THREE.FBXLoader();
		this.loadEnvironment(loader);
		
		this.renderer = new THREE.WebGLRenderer( { antialias: true } );
		this.renderer.setPixelRatio( window.devicePixelRatio );
		
		this.renderer.setSize(this.MapWidth, this.MapHeight);
		this.renderer.shadowMap.enabled = true;
		this.container2.appendChild( this.renderer.domElement );
		this.renderer.autoClear = false; // Para que no se borre el render al hacer resize 

        // CONTROL ORBITAL
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.target.set(0, 50, 0);
		this.controls.enableDamping = true;
		this.controls.enableZoom = true;
		this.controls.enablePan = false;


		// crear coliders
		this.createColliders();

		/////// Dibujar texto en canvas /////////

		// Crear el  elemento canvas
		this.canvas1 = document.createElement('canvas');
		this.context1 = this.canvas1.getContext('2d');
		this.context1.font = "Bold 30px Arial";

		
		// el contenido del lienzo se utilizará para la textura
		this.texture1 = new THREE.Texture(this.canvas1);
		this.texture1.needsUpdate = true;

		// para evitar el resized de la textura 
		this.texture1.minFilter = THREE.NearestFilter;

		// Material 
		this.spriteMaterial = new THREE.SpriteMaterial( {
			map: this.texture1,
		});

		this.sprite1 = new THREE.Sprite( this.spriteMaterial );
		this.sprite1.scale.set(10000,6000,1000);
		this.sprite1.position.set( 50, 50, 0 );
		this.scene.add( this.sprite1 );	

		// EVENTO RESIZE WINDOW
		window.addEventListener( 'resize', function(){ Mapa.onWindowResize(); }, true ); // real time



		// EVENTO MOUSE MOVE
		if('onmousemove' in window){
			window.addEventListener( 'mousemove', (event) => Mapa.onDocumentMouseMove(event), false );
		}

		//EVENTO CLICK
		if ('ontouchstart' in this.container2){
			this.container2.addEventListener( 'touchdown', (event) => Mapa.onMouseDown(event), false );
		}else{
			this.container2.addEventListener( 'mousedown', (event) => Mapa.onMouseDown(event), false );	
		}

	}

	// CLICK EVENT
	onMouseDown( event ) {
		// actualizar la posicion del mouse
		this.mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
		this.mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

		const raycaster = new THREE.Raycaster();
		raycaster.setFromCamera( this.mouse, this.camera );
		const intersects = raycaster.intersectObjects( this.remoteColliders );

		
		if (intersects.length>0){
			console.log("viaje rapido a : " + intersects[0].object.name);
			Swal.fire({
				title: 'Viajar a ' + intersects[0].object.name,
				icon: 'question',
				showCancelButton: true,
				confirmButtonColor: '#3085d6',
				cancelButtonColor: '#d33',
				confirmButtonText: 'Confirmar',
				cancelButtonText: 'Cancelar'
			}).then((result) => {				
				if (result.isConfirmed) {
					// Configuracion viaje rapido
					switch(intersects[0].object.name){
						case "Entrada Revolucion":
							document.getElementById('respawn').value='A';
						break;
						case "Entrada Boulevard":
							document.getElementById('respawn').value='B';
						break;
						default:
							document.getElementById('respawn').value='C';
					}
					var x = document.getElementById('respawn').value;
					// console.log(x);
					let form = document.getElementById("info-session");
					form.submit();
				}
			})

		}
	}

	onWindowResize() {
		this.camera.aspect = window.innerWidth / window.innerHeight;
		this.camera.updateProjectionMatrix();

		// actualizar tamaño
		this.MapWidth = this.container2.offsetWidth;
		this.MapHeight = this.container2.offsetHeight;
		this.renderer.setSize( this.MapWidth, this.MapHeight );
	}

	onDocumentMouseMove( event ) {
		// actualizar la posicion del mouse
		this.mouse.x = ( event.clientX / window.innerWidth) * 2 - 1;
		this.mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

		// actualizar la posicion del sprite
		this.sprite1.position.set(this.mouse.x, this.mouse.y +5500, 0 );
	}



	createColliders(){
        const geometry = new THREE.BoxGeometry(12000, 6000, 8000);
        const material = new THREE.MeshBasicMaterial({color:0x222222, wireframe:false ,visible:false});

        var respaw1__blv = new THREE.Mesh(geometry, material);
		respaw1__blv.position.set(-6000,2000,20000);
		respaw1__blv.name = "Entrada Boulevard"
		this.scene.add(respaw1__blv);

		var respaw2__rev = new THREE.Mesh(geometry, material);
		respaw2__rev.position.set(7000,3000,-15000);
		respaw2__rev.name = "Entrada Revolucion"
		this.scene.add(respaw2__rev);

		
		var respaw3__audi = new THREE.Mesh(geometry, material);
		respaw3__audi.position.set(2000,2000,1000);
		respaw3__audi.name = "Aud. Matute Remus"
		this.scene.add(respaw3__audi);


		this.remoteColliders.push(respaw1__blv);
		this.remoteColliders.push(respaw2__rev);
		this.remoteColliders.push(respaw3__audi);

		// console.log(this.remoteColliders);
    }
	
    loadEnvironment(loader){
		const Mapa = this;
		loader.load('resources/fbx/MapaCUCEI.fbx', function(object){
			Mapa.environment = object;
			Mapa.colliders = [];
			Mapa.scene.add(object);
            
			object.traverse( function ( child ) {
				if ( child.isMesh ) {
					if (child.name.startsWith("proxy")){
						Mapa.colliders.push(child);
						child.material.visible = false;
					}else{
						child.castShadow = true;
						child.receiveShadow = true;
					}
				}
			} );
			
			const tloader = new THREE.CubeTextureLoader();

			var textureCube = tloader.load( [
				`resources/images/nx.jpg`,
				`resources/images/px.jpg`,
				`resources/images/ny.jpg`,
				`resources/images/py.jpg`,
				`resources/images/nz.jpg`,
				`resources/images/pz.jpg`
			] );

			Mapa.scene.background = textureCube;
			Mapa.animate();
		})
	}
    

	animate() {
		const Mapa = this;
		const dt = this.clock.getDelta();
		requestAnimationFrame( function(){ Mapa.animate(); } );
		this.renderer.render( this.scene, this.camera );
        this.controls.update();
		Mapa.update();
	}

	update(){
		// crear un rayo con origen en la posición del mouse
		// y dirección en la escena (dirección de la cámara)
		var vector = new THREE.Vector3( this.mouse.x, this.mouse.y, 1 );
		var ray = new THREE.Raycaster( this.camera.position, vector.sub( this.camera.position ).normalize() );
		ray.setFromCamera(this.mouse, this.camera);
		
		// crea una matriz que contiene todos los objetos en la escena con la que se cruza el rayo
		var intersects = ray.intersectObjects(this.scene.children );

		// INTERSECTED = el objeto en la escena actualmente más cercano a la cámara e intersectado por el rayo proyectado desde la posición del mouse 	
		
		// si hay una (o más) intersecciones
		if ( intersects.length > 0 )
		{
		// si el objeto intersectado más cercano no es el objeto de intersección almacenado actualmente
			if ( intersects[ 0 ].object != this.INTERSECTED ) 
			{
				// restaurar el objeto de intersección anterior (si existe) a su color original
				if ( this.INTERSECTED ) 
					this.INTERSECTED.material.color.setHex( this.INTERSECTED.currentHex );
				// almacena la referencia al objeto más cercano como objeto de intersección actual
				this.INTERSECTED = intersects[ 0 ].object;
				// almacenar el color del objeto más cercano (para restauración posterior)
				this.INTERSECTED.currentHex = this.INTERSECTED.material.color.getHex();
				// establecer un nuevo color para el objeto más cercano
				this.INTERSECTED.material.color.setHex( 0xffff00 );
				
				// actualice el texto, si tiene un campo de "name".
				if ( intersects[ 0 ].object.name )
				{
					this.context1.clearRect(0,0,640,480);
					var message = intersects[ 0 ].object.name;
					var metrics = this.context1.measureText(message);
					var width = metrics.width;
					this.context1.fillStyle = "rgba(0,0,0,0.95)"; // borde negro
					this.context1.fillRect( 0,0, width+8,20+8);
					this.context1.fillStyle = "rgba(255,255,255,0.95)"; //relleno blanco
					this.context1.fillRect( 2,2, width+4,20+4 );
					this.context1.fillStyle = "rgba(0,0,0,1)"; //color de texto
					this.context1.fillText( message, 4,25 );
					this.texture1.needsUpdate = true;
				}
				else
				{
					this.context1.clearRect(0,0,300,300);
					this.texture1.needsUpdate = true;
				}
			}
		} 
		else // no hay intersecciones
		{
			// restaura el objeto de intersección anterior (si existe) a su color original
			if ( this.INTERSECTED ) 
				this.INTERSECTED.material.color.setHex( this.INTERSECTED.currentHex );
			// eliminar referencia de objeto de intersección anterior -> null
			this.INTERSECTED = null;
			this.context1.clearRect(0,0,300,300);
			this.texture1.needsUpdate = true;
		}
	}

}