
//  Copyright © 2016, 2017 Stewart Smith. See LICENSE for details.




Moar.applicationTitle = 'Day & Night'

var db = {

	scaleFactor:    0.25 / 6371000,
	sunRadius:           696300000,
	earthRadius:           6371000,
	earthOrbitRadius: 149600000000,
	moonRadius:            1737000,
	moonOrbitRadius:     384405000
}


//  Equatorial Coordinate System to XYZ convertor.
//  Right Ascension =  (0h) 0˚ .. +360˚ (24h)
//  Declination     =     -90˚ .. + 90˚
//  Distance is usually measured in Parsecs.

Moar.utils.ECStoXYZ = function( rightAscension, declination, distance ){

	rightAscension = THREE.Math.degToRad( rightAscension )
	declination    = THREE.Math.degToRad( declination )
	return [

		( Math.cos( declination ) * distance ) * Math.cos( rightAscension ),
		( Math.cos( declination ) * distance ) * Math.sin( rightAscension ),
		  Math.sin( declination ) * distance
	]
}




    //////////////////////
   //                  //
  //   Solar System   //
 //                  //
//////////////////////


Moar.StarfieldMaterial = function( starSprite ){

	THREE.ShaderMaterial.call( this )

	this.uniforms = {

		texture: { type: 't', value: starSprite }
	}
	this.vertexShader = Moar.utils.parseMultilineString( function(){/*

		attribute vec3  color;
		attribute float size;
		varying   vec3  vColor;
		
		void main(){
		
		    vColor = color;
		    vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
		    gl_PointSize    = size;
		    gl_Position     = projectionMatrix * mvPosition;
		}
	*/})
	this.fragmentShader = Moar.utils.parseMultilineString( function(){/*

		uniform sampler2D texture;
		varying vec3 vColor;
		
		void main(){
		
		    gl_FragColor = vec4( vColor, 1.0 );
		    gl_FragColor = gl_FragColor * texture2D( texture, gl_PointCoord );
		}
	*/})
	this.transparent = true
	this.depthTest   = true
	this.depthWrite  = false
	this.blending    = THREE.AdditiveBlending
}
Moar.StarfieldMaterial.prototype = Object.create( THREE.ShaderMaterial.prototype )
Moar.StarfieldMaterial.prototype.constructor = Moar.StarfieldMaterial.prototype


Moar.SolarSystem = function( starSprite ){

	THREE.Object3D.call( this )
	this.name = 'solarSystem'
	this.renderOrder = 0

	var 
	that = this,
	geometry, 
	i,
	starsTotal = 36146,
	color = new THREE.Color(), 
	hue, sat, lit,
	field


	geometry = new THREE.BufferGeometry()
	geometry.addAttribute( 'position', new THREE.BufferAttribute( new Float32Array( starsTotal * 3 ), 3 ))
	geometry.addAttribute( 'color',    new THREE.BufferAttribute( new Float32Array( starsTotal * 3 ), 3 ))
	geometry.addAttribute( 'size',     new THREE.BufferAttribute( new Float32Array( starsTotal * 3 ), 1 ))

	field = new THREE.Points( geometry, new Moar.StarfieldMaterial( starSprite ))
	field.name = 'starfield'
	field.frustumCulled = false
	field.renderOrder   = 1
	this.add( field )


	const oReq = new XMLHttpRequest()
	oReq.open( 'GET', 'media/stars.dat', true )
	oReq.responseType = 'arraybuffer'
	oReq.onload = function( oEvent ){

		console.log( 'OMG it’s full of stars! ')
		const arrayBuffer = oReq.response//  Note: not oReq.responseText
		if( arrayBuffer ){
		
			const byteArray = new Int16Array( arrayBuffer )
			let row = []
			for( let i = 0; i < byteArray.length; i ++ ){
			
				if( i % 4 === 0 && row.length === 4 ){

					let starIndex = ( i / 4 ) - 1


					//  Star position.

					let v = Moar.utils.ECStoXYZ( 15 * row[ 0 ], row[ 1 ], 1000 )
					geometry.attributes.position.setXYZ( starIndex, v[0], v[1], v[2] )
					

					//  Star size.

					geometry.attributes.size.setXYZ( starIndex, 0.1 + row[ 2 ] / 3 )


					//  Star color.

					hue = ( 200 + Math.random() * 100 ) / 360
					sat = 1.0
					lit = 0.8
					color.setHSL( hue, sat, lit )
					geometry.attributes.color.setXYZ( starIndex, color.r, color.g, color.b )

					row = []
				}
				let value = byteArray[ i ] / 100
				row.push( value )
			}
			geometry.attributes.position.needsUpdate = true
			geometry.attributes.size.needsUpdate     = true
			geometry.attributes.color.needsUpdate    = true
		}
	}
	oReq.send( null )
}
Moar.SolarSystem.prototype = Object.create( THREE.Object3D.prototype )
Moar.SolarSystem.prototype.constructor = Moar.SolarSystem.prototype








    /////////////
   //         //
  //   Sun   //
 //         //
/////////////


Moar.Sun = function( sunRaysInput ){

	THREE.Object3D.call( this )
	this.name = 'sun'
	this.renderOrder = 2

	const sunRadiusScaled = db.sunRadius * db.scaleFactor


	//  Burning sun!
	//  This example shader got me started on the right foot, thank you flight404  ;)
	//  https://www.shadertoy.com/view/4dXGR4
	//  And this too: https://www.shadertoy.com/view/llfGD4

	const 
	burnMaterial = new THREE.ShaderMaterial({

		depthTest:   true,
		depthWrite:  false,
		transparent: true,
		side:        THREE.DoubleSide,
		uniforms: {
			
			raysTexture: { type: 't', value: sunRaysInput },
			timeNow:     { type: 'f', value: 0 }
		},
		vertexShader: Moar.utils.parseMultilineString( function(){/*

			varying vec2 vUv;

			void main(){
			    
				vUv = uv;

				vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
				gl_Position = projectionMatrix * mvPosition;
			}

		*/}),
		fragmentShader: Moar.utils.parseMultilineString( function(){/*

			uniform sampler2D raysTexture;
			uniform float     timeNow;
			varying vec2      vUv;


			//  Noise! Originally by trisomie21.

			float snoise( vec3 uv, float res ){

				const vec3 s = vec3( 1e0, 1e2, 1e4 );
				uv *= res;
				vec3 uv0 = floor( mod( uv, res )) * s;
				vec3 uv1 = floor( mod( uv + vec3( 1.0 ), res )) * s;
				vec3 f = fract( uv );
				f = f * f * ( 3.0 - 2.0 * f );
				vec4 v = vec4( 
				
					uv0.x + uv0.y + uv0.z, 
					uv1.x + uv0.y + uv0.z,
					uv0.x + uv1.y + uv0.z, 
					uv1.x + uv1.y + uv0.z
				);
				vec4 r = fract( sin( v * 1e-3 ) * 1e5 );
				float r0 = mix( 

					mix( r.x, r.y, f.x ), 
					mix( r.z, r.w, f.x ), 
					f.y
				);
				r = fract( sin(( v + uv1.z - uv0.z ) * 1e-3 ) * 1e5 );
				float r1 = mix( 

					mix( r.x, r.y, f.x ), 
					mix( r.z, r.w, f.x ),
					f.y
				);
				return mix( r0, r1, f.z ) * 2.0 -1.0;
			}


			void main(){
				

				//  Things to tweak.

				float starRadius = 0.03;
				float brightness = 0.25;
				vec4  orange     = vec4( 0.8, 0.65, 0.3, 1.0 );
				vec4  orangeRed  = vec4( 0.8, 0.35, 0.1, 1.0 );
				

				//  No, no you don’t. No touch.

				vec2 p = -1.0 + 2.0 * vUv;
				float distanceFromCenter = length( p );


				//  Ok, first thing’s first.
				//  The center is so bright white hot there’s no need to do other computation.

				if( distanceFromCenter <= starRadius ){
					
					gl_FragColor = vec4( 1.0, 1.0, 1.0, 1.0 );
				}
				else {

	
					//  Ma-ma-ma-ma-myyyyy corona.

					float fade     = pow( length( 2.0 * p ), 0.5 );
					float coronaTime = timeNow * 0.005;
					float fVal1    = 1.0 - fade;
					float fVal2    = 1.0 - fade;
					float angle	   = atan( p.x, p.y ) / 6.2832;
					vec3 coord     = vec3( angle, distanceFromCenter, coronaTime );
					float newTime1 = abs( snoise( coord + vec3( 0.0, -coronaTime * ( 0.35 + brightness * 0.001 ), coronaTime * 0.015 ), 15.0 ));//15
					float newTime2 = abs( snoise( coord + vec3( 0.0, -coronaTime * ( 0.15 + brightness * 0.001 ), coronaTime * 0.015 ), 45.0 ));//45
					for( int i = 1; i <= 7; i ++ ){
						
						float power = pow( 2.0, float( i + 1 ));
						fVal1 += ( 0.5 / power ) * snoise( coord + vec3( 0.0, -coronaTime, coronaTime * 0.2 ), ( power * ( 10.0 ) * ( newTime1 + 1.0 )));
						fVal2 += ( 0.5 / power ) * snoise( coord + vec3( 0.0, -coronaTime, coronaTime * 0.2 ), ( power * ( 25.0 ) * ( newTime2 + 1.0 )));
					}
					float corona = pow( fVal1 * max( 1.1 - fade, 0.0 ), 2.0 );
					corona      *= 1.0 - newTime1;
					float invRadius = 1.0 / starRadius;
					if( distanceFromCenter <= starRadius ){

						corona *= pow( distanceFromCenter * invRadius, 12.0 );
					}
					vec4 coronaColor = corona * orange;// * 1.2;


					//  Star glow.

					float starGlow = ( starRadius / distanceFromCenter ) * fade;
					vec4  starGlowColor = starGlow * orangeRed * 2.0;
					

					//  Sunshine rays!

					vec4 raysColor = vec4( 0.0 );
					if( distanceFromCenter >= starRadius ){

						float falloff = 9.0;//  Higher number = quicker falloff. Was 6.2.
						raysColor = texture2D( raysTexture, vec2( atan( p.y, p.x ), 1.0 ) + timeNow * 0.01 ) / length( p * falloff );
						raysColor.a *= 0.4;
					}


					//  Combine all our color computations into one pixel.

					gl_FragColor  = vec4( 0.0 );
					gl_FragColor += coronaColor;
					gl_FragColor += starGlowColor;
					gl_FragColor += raysColor;
				}


				//  For a quick reality check switch to if( true ).

				if( false ){
					
					if( distanceFromCenter <  starRadius ) gl_FragColor = vec4( 1.0, 0.0, 1.0, 0.5 );
					if( distanceFromCenter >= starRadius ) gl_FragColor = vec4( 0.0, 0.0, 1.0, 0.5 );
				}
			}
		*/})
	}),
	burnMesh = new THREE.Mesh(

		new THREE.PlaneGeometry( sunRadiusScaled * 60, sunRadiusScaled * 60 ),
		burnMaterial
	)
	
	burnMaterial.uniforms.raysTexture.value.wrapS = burnMaterial.uniforms.raysTexture.value.wrapT = THREE.RepeatWrapping
	burnMesh.frustumCulled = false
	burnMesh.renderOrder = 3
	this.add( burnMesh )
	Moar.updateTasks.add( function(){

		burnMaterial.uniforms.timeNow.value = Moar.clock.getElapsedTime()
		burnMesh.lookAt( Moar.camera )
	})
	

	//  Sun ball itself.
	/*
	const mesh = new THREE.Mesh( 

		new THREE.OctahedronGeometry( sunRadiusScaled, 5 ),//  Actual size of the sun in meters!
		new THREE.MeshBasicMaterial({

			map: sunMap
		})
	)
	mesh.castShadow    = false//true
	mesh.receiveShadow = false
	mesh.renderOrder = 4
	this.add( mesh )
	*/


	//  Main direct light from sun.

	const light = new THREE.DirectionalLight( 0xFFEECC, 1.0 )	
	light.name = 'sunlight'
	light.castShadow           =  true
	light.shadow.camera.near   =  1
	light.shadow.camera.far    =  5
	light.shadow.camera.fov    = 30
	light.shadow.camera.left   = -1
	light.shadow.camera.right  =  1
	light.shadow.camera.top    =  1
	light.shadow.camera.bottom = -1
	this.add( light )


	//  Where’s this sun supposed to be, anyway?

	this.position.set( 0, 0, db.earthOrbitRadius * db.scaleFactor * -0.1 )
	this.frustumCulled = false
}
Moar.Sun.prototype = Object.create( THREE.Object3D.prototype )
Moar.Sun.prototype.constructor = Moar.Sun.prototype








    ///////////////
   //           //
  //   Earth   //
 //           //
///////////////


Moar.EarthDayMaterial = function( map, bumpMap, specularMap ){

	THREE.MeshPhongMaterial.call( this )

	this.map         = map
	this.bumpMap     = bumpMap
	this.specularMap = specularMap
	this.shininess   = 30
	this.bumpScale   =  0.005
	//this.specular.setStyle( '#131211' )
	this.depthTest   = true
	this.depthWrite  = true
}
Moar.EarthDayMaterial.prototype = Object.create( THREE.MeshPhongMaterial.prototype )
Moar.EarthDayMaterial.prototype.constructor = Moar.EarthDayMaterial.prototype


Moar.EarthNightMaterial = function( earthMapNight ){

	THREE.MeshLambertMaterial.call( this )

	this.map         = earthMapNight
	this.opacity     = 0.95
	this.side        = THREE.BackSide
	this.transparent = true
	this.depthTest   = true
	this.depthWrite  = false
	this.blending    = THREE.AdditiveBlending
	this.blendDst    = THREE.OneFactor
	this.blendSrc    = THREE.OneFactor
	this.color.setStyle( '#FFF699' )
}
Moar.EarthNightMaterial.prototype = Object.create( THREE.MeshLambertMaterial.prototype )
Moar.EarthNightMaterial.prototype.constructor = Moar.EarthNightMaterial.prototype


Moar.EarthClouds = function( surfaceRadius, skyRadius, detail, earthCloudMap ){
	
	THREE.Object3D.call( this )
	this.name = 'clouds'

	var
	surface = new THREE.Mesh(

		new THREE.OctahedronGeometry( surfaceRadius, detail ),
		new THREE.MeshPhongMaterial({

			map:         earthCloudMap,
			color:       0x000000,
			transparent: true,
			depthTest:   true,
			depthWrite:  false,
			opacity:     0.8
		})
	),
	sky = new THREE.Mesh(

		new THREE.OctahedronGeometry( skyRadius, detail ),
		new THREE.MeshPhongMaterial({

			map:         earthCloudMap,
			color:       0xFFFFFF,
			transparent: true,
			depthTest:   true,
			depthWrite:  false
			//side:        THREE.DoubleSide//  Would be pretty from inside, but can’t because of draw order issues...
		})
	)
	
	surface.renderOrder   = 7
	surface.receiveShadow = false
	surface.castShadow    = false
	this.add( surface )

	sky.renderOrder   = 8
	sky.receiveShadow = true
	sky.castShadow    = true
	this.add( sky )
}
Moar.EarthClouds.prototype = Object.create( THREE.Object3D.prototype )
Moar.EarthClouds.prototype.constructor = Moar.EarthClouds.prototype




Moar.AtmosphereMaterial = function( map ){

	THREE.ShaderMaterial.call( this )

	const that = this

	this.uniforms = {

		//pointLightPosition: { type: 'v3', value: Moar.sun.position },
		pointLightPosition: { type: 'v3', value: new THREE.Vector3( 0, 0, -100 )}
	}
	this.vertexShader = Moar.utils.parseMultilineString( function(){/*

		varying vec3 vNormal;
		varying vec3 cameraVector;
		varying vec3 vPosition;

		void main(){
			
			vNormal = normal;
			vec4 vPosition4 = modelMatrix * vec4( position, 1.0 );
			vPosition    = vPosition4.xyz;
			cameraVector = cameraPosition - vPosition;
			gl_Position  = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}
	*/})
	this.fragmentShader = Moar.utils.parseMultilineString( function(){/*

		uniform vec3 pointLightPosition;
		varying vec3 vNormal;
		varying vec3 vPosition;
		varying vec3 cameraVector;
		varying vec2 vUv;
        
		void main(){
			
			float PI = 3.14159265358979323846264;
			vec3  light = pointLightPosition - vPosition;
			vec3  cameraDir = normalize( cameraVector );
			
			light = normalize( light );
			
			float viewAngle = max( 0.0, dot( vNormal, cameraDir ));
			float adjustedViewAngle = min( 0.65, viewAngle  ) / 0.65;
			float invertedViewAngle = pow( acos( viewAngle  ), 3.0 ) * 0.4;
			
			float gain = 0.0;
			gain += invertedViewAngle * 0.5 * ( max( -0.35, dot( vNormal, light )) + 0.35 );
			gain *= 0.7 + pow( invertedViewAngle / ( PI / 2.0 ), 2.0 );
			
			gl_FragColor = vec4( gain * 0.5, gain * 0.9, gain, 1.0 );
		}
	*/})
	this.transparent = true
	this.blending = THREE.AdditiveBlending


	Moar.updateTasks.add( function(){

		that.uniforms.pointLightPosition.value = Moar.camera.getWorldPosition()//Moar.sun.getWorldPosition()
	})
}
Moar.AtmosphereMaterial.prototype = Object.create( THREE.ShaderMaterial.prototype )
Moar.AtmosphereMaterial.prototype.constructor = Moar.AtmosphereMaterial.prototype


Moar.Atmosphere = function( radius, detail ){

	THREE.Object3D.call( this )

	var mesh = new THREE.Mesh(

		new THREE.OctahedronGeometry( radius, detail ),
		new Moar.AtmosphereMaterial()
	)

	this.add( mesh )
}
Moar.Atmosphere.prototype = Object.create( THREE.Object3D.prototype )
Moar.Atmosphere.prototype.constructor = Moar.Atmosphere.prototype




Moar.Earth = function( 

	earthMapDay,
	earthMapBump,
	earthMapSpecular,
	earthMapNight,
	earthMapClouds
){
	
	THREE.Object3D.call( this )
	this.name = 'earth'

	var 
	s = this,
	radius = db.earthRadius * db.scaleFactor,
	detail = 5,
	earthTilted = new THREE.Object3D(),
	nightGeometry,
	clouds


	//  Earth’s axial tilt.

	earthTilted.rotation.z = THREE.Math.degToRad( 23 )
	earthTilted.name = 'earthAxialTilt'
	this.add( earthTilted )


	//  Earth day.

	this.earthDay = new THREE.Mesh( 

		new THREE.OctahedronGeometry( radius, detail ),
		new Moar.EarthDayMaterial( earthMapDay, earthMapBump, earthMapSpecular )
	)
	this.earthDay.name = 'Earth day'
	this.earthDay.renderOrder = 5
	this.earthDay.receiveShadow = true
	earthTilted.rotation.y = THREE.Math.degToRad( 180 )
	earthTilted.add( this.earthDay )
	

	//  Earth night.

	nightGeometry = this.earthDay.geometry.clone()
	nightGeometry.applyMatrix(( new THREE.Matrix4() ).makeScale( -1, 1, 1 ))//  Need to flip it for proper dark side-ness!
	this.earthNight = new THREE.Mesh( 

		nightGeometry, 
		new Moar.EarthNightMaterial( earthMapNight )
	)
	this.earthNight.renderOrder = 6
	this.earthNight.receiveShadow = false
	this.earthNight.rotation.y = THREE.Math.degToRad( 180 )
	earthTilted.add( this.earthNight )
	

	//  Earth clouds. 

	clouds = new Moar.EarthClouds( radius * 1.001, radius * 1.01, detail, earthMapClouds )
	earthTilted.add( clouds )


	//  Earth atmosphere.

	// this.atmosphere = new Moar.Atmosphere( radius * 1.03, detail, earthMapDay )
	// this.add( this.atmosphere )
	



	Moar.updateTasks.add( function(){

		var 
		//sunPositionRelativeToEarth = Moar.earth.worldToLocal( Moar.sun.getWorldPosition() ),
		//sunPositionAbsolute = Moar.sun.getWorldPosition().
		baseRotation = Moar.clock.getElapsedTime() * ( Moar.Earth.rotationDegreesPerSecond * THREE.Math.DEG2RAD ) + Math.PI

		earthTilted.rotation.y = baseRotation
		if( clouds !== undefined ) clouds.rotation.y = baseRotation * 0.1
	})
}
Moar.Earth.prototype = Object.create( THREE.Object3D.prototype )
Moar.Earth.prototype.constructor = Moar.Earth.prototype
Moar.Earth.rotationDegreesPerSecond = 2








    //////////////
   //          //
  //   Moon   //
 //          //
//////////////


Moar.Moon = function( moonMap, moonMapBump ){

	THREE.Object3D.call( this )

	var 
	bodyRadius  = db.moonRadius * db.scaleFactor,
	orbitRadius = db.moonOrbitRadius * db.scaleFactor,
	mesh = new THREE.Mesh( 

		new THREE.OctahedronGeometry( bodyRadius, 5 ),
		new THREE.MeshPhongMaterial({

			map         : moonMap,
			bumpMap     : moonMapBump,
			bumpScale   : 0.002,
			side        : THREE.DoubleSide
			// specularMap : moonMapBumpSpecular,
			// specular    : new THREE.Color( 0xFFFFFF ),
			// shininess   : 40
		})
	)
	
	mesh.castShadow    =  true
	mesh.receiveShadow =  true
	mesh.position.set( 0, 0, orbitRadius / 10 )
	mesh.rotation.set( 0, Math.PI, 0 )

	this.name = 'moon'
	this.rotation.y = THREE.Math.degToRad( 90 )
	this.add( mesh )
}
Moar.Moon.prototype = Object.create( THREE.Object3D.prototype )
Moar.Moon.prototype.constructor = Moar.Moon.prototype







