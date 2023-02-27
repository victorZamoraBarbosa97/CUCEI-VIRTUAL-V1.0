class Game{
	constructor(ID,MODELO,ATUENDO,COLOR){
		if ( ! Detector.webgl ) Detector.addGetWebGLMessage();
		
		this.container;
		this.player = { };
		this.logo = { };
        this.animations = {};
		this.stats;
		this.controls;
		this.camera;
		this.scene;
		this.renderer;
		this.ID = ID;
		this.MODELO = MODELO;
		this.ATUENDO = ATUENDO;
		this.COLOR = COLOR;
		document.getElementById("modelo_name").innerHTML = this.MODELO; 
		document.getElementById("piel_name").innerHTML = this.ATUENDO; 
		document.getElementById("color_name").innerHTML = this.COLOR; 

		this.modelos = ['Cabello 1','Cabello 2','Cabello 3','Sombrero 1','Sombrero 2','Sombrero 3','Sombrero 4','Sombrero 5','Sombrero 6'];

		this.atuendos = ['Atracador','Bagabundo','Basquetbolista','Bombero','Enfermera','Hombre Casual 1','Hombre Casual 2','Mujer Casual',
						'Mujer Casual 2','Oficial 1','Oficial 2','Oficial 3','Ropa de Playa','Trabajador','Traje 1','Traje 2'];
		
		this.colores = ['1','2','3'];

		// obtener el index de la configuracion actual
		this.modelos_Index = this.modelos.indexOf(MODELO);
		this.atuendos_Index = this.atuendos.indexOf(ATUENDO);
		this.colores_index = this.colores.indexOf(COLOR);
				
		this.container = document.createElement( 'div' );
		this.container.style.height = '100%';
		this.container.style.overflow = "hidden";
		document.body.appendChild( this.container );
        
		this.anims = ['Pointing Gesture'];
		this.clock = new THREE.Clock();
        this.init();

		window.onError = function(error){
			console.error(JSON.stringify(error));
		}
	}
	
	init() {
		this.camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 2000 );
		this.camera.position.set(112, 100, 400);
        
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color( 0xa0a0a0 );
		this.scene.fog = new THREE.Fog( 0xa0a0a0, 700, 1800 );

		let light = new THREE.HemisphereLight( 0xffffff, 0x444444 );
		light.position.set( 0, 200, 0 );
		this.scene.add( light );

		light = new THREE.DirectionalLight( 0xffffff );
		light.position.set( 0, 200, 100 );
		light.castShadow = true;
		light.shadow.camera.top = 180;
		light.shadow.camera.bottom = -100;
		light.shadow.camera.left = -120;
		light.shadow.camera.right = 120;
		this.scene.add( light );

		// suelo
		var mesh = new THREE.Mesh( new THREE.PlaneBufferGeometry( 4000, 4000 ), new THREE.MeshPhongMaterial( { color: 0x21CC21, depthWrite: false } ) );
		mesh.rotation.x = - Math.PI / 2;
		//mesh.position.y = -100;
		mesh.receiveShadow = true;
		this.scene.add( mesh );

		// modelo
		const loader = new THREE.FBXLoader();
		const loader_LOGO = new THREE.FBXLoader();
		const game = this;

		// Primer carga de personaje
		loader.load( `resources/fbx/people/${game.MODELO}.fbx`, function ( object ) {
			object.mixer = new THREE.AnimationMixer( object );
			game.player.mixer = object.mixer;
			game.player.root = object.mixer.getRoot();
			
			object.name = "Personaje";
					
			object.traverse( function ( child ) {
				if ( child.isMesh ) {
					child.castShadow = true;
					child.receiveShadow = false;		
				}
			} );
			
            const tLoader = new THREE.TextureLoader();
            tLoader.load(`resources/images/${game.ATUENDO}_${game.COLOR}.png`, function(texture){
				object.traverse( function ( child ) {
					if ( child.isMesh ){
						child.material.map = texture;
					}
				} );
			});
            
			game.scene.add(object);
			game.player.object = object;
			game.animations.Idle = object.animations[0];
            game.loadNextAnim(loader);
		});


		// load modelo logo cucei
		loader_LOGO.load( `resources/fbx/LOGO_CUCEI.fbx`, function ( object ) {
			object.name = "LOGO";
			game.scene.add(object);
			game.logo.object = object;
			game.logo.object.position.set(-600,0,-550);
			game.logo.object.scale.set(3,3,3);
		});

		
		this.renderer = new THREE.WebGLRenderer( { antialias: true } );
		this.renderer.setPixelRatio( window.devicePixelRatio );
		this.renderer.setSize( window.innerWidth, window.innerHeight );
		this.renderer.shadowMap.enabled = true;
		this.container.appendChild( this.renderer.domElement );
        
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.target.set(0, 150, 0);
        this.controls.update();
			
		window.addEventListener( 'resize', function(){ game.onWindowResize(); }, false );


	} // fin de init 
	
    loadNextAnim(loader){
		let anim = this.anims.pop();
		const game = this;
		loader.load( `resources/fbx/anims/${anim}.fbx`, function( object ){
			game.animations[anim] = object.animations[0];
			if (game.anims.length>0){
				game.loadNextAnim(loader);
			}else{
				delete game.anims;
				game.action = "Idle";
				game.animate();
			}
		});	
	}
    
	onWindowResize() {
		this.camera.aspect = window.innerWidth / window.innerHeight;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize( window.innerWidth, window.innerHeight );
	}

    set action(name){
		const action = this.player.mixer.clipAction( this.animations[name] );
        action.time = 0;
		this.player.mixer.stopAllAction();
		this.player.action = name;
		this.player.actionTime = Date.now();
        this.player.actionName = name;
		
		action.fadeIn(0.5);	
		action.play();
	}
    
    get action(){
        if (this.player===undefined || this.player.actionName===undefined) return "";
        return this.player.actionName;
    }

	CargarPersonaje(){
		const loader = new THREE.FBXLoader();
		document.getElementById("modelo_name").innerHTML = this.MODELO; 
		document.getElementById("piel_name").innerHTML = this.ATUENDO; 
		document.getElementById("color_name").innerHTML = this.COLOR;

		loader.load(`resources/fbx/people/${this.MODELO}.fbx`, function ( object ) {
			object.mixer = new THREE.AnimationMixer( object );
			game.player.mixer = object.mixer;
			game.player.root = object.mixer.getRoot();
			
			object.name = "Personaje";
					
			object.traverse( function ( child ) {
				if ( child.isMesh ) {
					child.castShadow = true;
					child.receiveShadow = false;		
				}
			} );
			
            const tLoader = new THREE.TextureLoader();
            tLoader.load(`resources/images/${game.ATUENDO}_${game.COLOR}.png`, function(texture){
				object.traverse( function ( child ) {
					if ( child.isMesh ){
						child.material.map = texture;
					}
				});
			});
			// Remover el personaje actual de la escena.
            game.scene.children.forEach( function(object){
				if(object.name == "Personaje" &&  object.type == "Group"){
				game.scene.remove(object);
				}
			});

			game.scene.add(object);
			game.player.object = object;
			game.anims = ['Pointing Gesture'];
            game.loadNextAnim(loader);

		});
	}

	toggleModel_D(){
		const game=this;
		if (this.modelos_Index +1 <= this.modelos.length-1){
			this.modelos_Index +=1;
		}
		else{
			this.modelos_Index = 0;
		}
		// cambiar el modelo
		this.MODELO = this.modelos[this.modelos_Index];
		game.CargarPersonaje();
	}
	
	toggleModel_I(){
		const game=this;
		if (this.modelos_Index -1 >= 0){
			this.modelos_Index -=1;
		}
		else{
			this.modelos_Index = this.modelos.length-1;
		}
		// cambiar el modelo
		this.MODELO = this.modelos[this.modelos_Index];
		game.CargarPersonaje();
	}

	toggleAtuendo_D(){
		const game=this;
		if (this.atuendos_Index +1 <= this.atuendos.length-1){
			this.atuendos_Index +=1;
		}
		else{
			this.atuendos_Index = 0;
		}
		// cambiar el modelo
		this.ATUENDO = this.atuendos[this.atuendos_Index];
		game.CargarPersonaje();
	}
	
	toggleAtuendo_I(){
		const game=this;
		if (this.atuendos_Index -1 >= 0){
			this.atuendos_Index -=1;
		}
		else{
			this.atuendos_Index = this.atuendos.length-1;
		}
		// cambiar el modelo
		this.ATUENDO = this.atuendos[this.atuendos_Index];
		game.CargarPersonaje();
	}

	toggleColor_D(){
		const game=this;
		if (this.colores_Index +1 <= this.colores.length-1){
			this.colores_Index +=1;
		}
		else{
			this.colores_Index = 0;
		}
		// cambiar el modelo
		this.COLOR = this.colores[this.colores_Index];
		game.CargarPersonaje();
	}
	
	toggleColor_I(){
		const game=this;
		if (this.colores_Index -1 >= 0){
			this.colores_Index -=1;
		}
		else{
			this.colores_Index = this.colores.length-1;
		}
		// cambiar el modelo
		this.COLOR = this.colores[this.colores_Index];
		game.CargarPersonaje();
	}

    toggleAnimation(){
        if (game.action=="Idle"){
            game.action = "Pointing Gesture";
        }else{
            game.action = "Idle";
        }
    }

	GetValues(){
		document.getElementById("modeloF").value = this.MODELO;
		document.getElementById("atuendoF").value = this.ATUENDO;
		document.getElementById("colorF").value = this.COLOR;
	}
    
	animate() {
		const game = this;
		const dt = this.clock.getDelta();
		
		requestAnimationFrame( function(){ game.animate(); } );
		
		if (this.player.mixer!==undefined) this.player.mixer.update(dt);
		
		this.renderer.render( this.scene, this.camera );
	}
}