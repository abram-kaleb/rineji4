// CADViewer.tsx
import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';
import DxfParser from 'dxf-parser';
import Header from './Header';

const CADViewer: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scaleText, setScaleText] = useState('10 unit');
    const [currentFile, setCurrentFile] = useState('/linesplan.dxf');

    const base = import.meta.env.BASE_URL;

    const drawingFiles = [
        { name: 'Lines Plan', path: `${base}linesplan.dxf` },
        { name: 'General Arrangement', path: `${base}generalarrangement.dxf` },
        { name: 'Machinery', path: `${base}machinery.dxf' ` },
        { name: 'Electrical', path: `${base}electrical.dxf` }
    ];

    const FONT_URL = 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/fonts/helvetiker_regular.typeface.json';

    const getAutoCADColor = (index: number) => {
        const aciColors: { [key: number]: string } = {
            1: '#ff0000', 2: '#ffff00', 3: '#00ff00', 4: '#00ffff',
            5: '#0000ff', 6: '#ff00ff', 7: '#ffffff', 8: '#808080', 9: '#c0c0c0'
        };
        return aciColors[index] || '#ffffff';
    };

    const cleanMText = (text: string) => {
        if (!text) return "";
        return text.replace(/\\P/g, '\n').replace(/\{[^}]+\}/g, '').replace(/\\[A-Z].;?/g, '').replace(/%%u/gi, '').replace(/\\L/gi, '').replace(/\\l/gi, '').replace(/}/g, '').replace(/{/g, '').replace(/\\~?(\^I|\\)/g, ' ');
    };


    const processEntities = (entities: any[], font: any, dxf: any, group: THREE.Group) => {
        entities.forEach((entity: any) => {
            const colorHex = entity.colorIndex ? getAutoCADColor(entity.colorIndex) : (entity.color ? `#${entity.color.toString(16).padStart(6, '0')}` : '#ffffff');
            const color = new THREE.Color(colorHex);
            let points: THREE.Vector3[] = [];

            if (entity.type === 'LINE') {
                points.push(new THREE.Vector3(entity.vertices[0].x, entity.vertices[0].y, 0));
                points.push(new THREE.Vector3(entity.vertices[1].x, entity.vertices[1].y, 0));
            } else if (entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') {
                entity.vertices.forEach((v: any) => points.push(new THREE.Vector3(v.x, v.y, 0)));
                if (entity.shape) points.push(points[0]);
            } else if (entity.type === 'CIRCLE' || entity.type === 'ARC') {
                const startAngle = entity.type === 'ARC' ? entity.startAngle : 0;
                const endAngle = entity.type === 'ARC' ? entity.endAngle : 2 * Math.PI;
                const curve = new THREE.EllipseCurve(entity.center.x, entity.center.y, entity.radius, entity.radius, startAngle, endAngle, false, 0);
                curve.getPoints(50).forEach(p => points.push(new THREE.Vector3(p.x, p.y, 0)));
            } else if (entity.type === 'SOLID' || entity.type === 'TRACE') {
                const v = entity.points || entity.vertices;
                if (v && v.length >= 3) {
                    const shape = new THREE.Shape();
                    shape.moveTo(v[0].x, v[0].y);
                    shape.lineTo(v[1].x, v[1].y);
                    shape.lineTo(v[3] ? v[3].x : v[2].x, v[3] ? v[3].y : v[2].y);
                    shape.lineTo(v[2].x, v[2].y);
                    shape.closePath();
                    const geom = new THREE.ShapeGeometry(shape);
                    const mesh = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
                    group.add(mesh);
                }
            } else if (entity.type === 'LEADER') {
                entity.vertices.forEach((v: any) => points.push(new THREE.Vector3(v.x, v.y, 0)));
                if (points.length >= 2) {
                    const p1 = points[0];
                    const p2 = points[1];
                    const dir = new THREE.Vector3().subVectors(p1, p2).normalize();
                    const size = entity.arrowheadSize || 2.5;
                    const head = new THREE.Vector3().copy(p1);
                    const v1 = new THREE.Vector3(-dir.y, dir.x, 0).multiplyScalar(size * 0.35);
                    const v2 = new THREE.Vector3(dir.y, -dir.x, 0).multiplyScalar(size * 0.35);
                    const base = new THREE.Vector3().copy(head).sub(dir.clone().multiplyScalar(size));
                    const shape = new THREE.Shape();
                    shape.moveTo(head.x, head.y);
                    shape.lineTo(base.x + v1.x, base.y + v1.y);
                    shape.lineTo(base.x + v2.x, base.y + v2.y);
                    shape.closePath();
                    group.add(new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ color })));
                }
            }

            if (points.length > 0) {
                const geometry = new THREE.BufferGeometry().setFromPoints(points);
                group.add(new THREE.Line(geometry, new THREE.LineBasicMaterial({ color })));
            }

            const textTypes = ['TEXT', 'MTEXT', 'ATTRIB', 'ATTDEF'];
            if (textTypes.includes(entity.type)) {
                const rawText = entity.text || entity.value || "";
                const cleanText = cleanMText(rawText);
                if (cleanText.trim().length > 0) {
                    const h = entity.textHeight || entity.height || 2;
                    const tGeo = new TextGeometry(cleanText, { font: font, size: h, height: 0, curveSegments: 2 });
                    const tMesh = new THREE.Mesh(tGeo, new THREE.MeshBasicMaterial({ color }));
                    const x = entity.startPoint?.x ?? entity.position?.x ?? entity.insertionPoint?.x ?? 0;
                    const y = entity.startPoint?.y ?? entity.position?.y ?? entity.insertionPoint?.y ?? 0;
                    tMesh.position.set(x, y, 0.1);
                    if (entity.rotation) tMesh.rotation.z = (entity.rotation * Math.PI) / 180;
                    group.add(tMesh);
                }
            }

            if (entity.type === 'INSERT' && dxf.blocks[entity.name]) {
                const blockGroup = new THREE.Group();
                processEntities(dxf.blocks[entity.name].entities, font, dxf, blockGroup);
                blockGroup.position.set(entity.position.x, entity.position.y, 0);
                if (entity.scale) blockGroup.scale.set(entity.scale.x || 1, entity.scale.y || 1, 1);
                if (entity.rotation) blockGroup.rotation.z = (entity.rotation * Math.PI) / 180;
                group.add(blockGroup);
            }
        });
    };

    const renderDxf = (data: string) => {
        if (!containerRef.current) return;
        const parser = new DxfParser();
        let dxf: any;
        try { dxf = parser.parseSync(data); } catch (err) { return; }

        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x212830);

        const frustumSize = 2000;
        const aspect = width / height;
        const camera = new THREE.OrthographicCamera((frustumSize * aspect) / -2, (frustumSize * aspect) / 2, frustumSize / 2, frustumSize / -2, 1, 1000000);

        const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);
        containerRef.current.innerHTML = '';
        containerRef.current.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableRotate = false;
        controls.enableDamping = false;
        controls.zoomSpeed = 2.0;

        // Kontrol Touchscreen: Satu jari untuk Pan (Geser)
        controls.touches = {
            ONE: THREE.TOUCH.PAN,
            TWO: THREE.TOUCH.DOLLY_PAN
        };

        // Mouse Buttons tetap standar
        controls.mouseButtons = {
            LEFT: THREE.MOUSE.PAN,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.PAN
        };

        const gridMaterial = new THREE.ShaderMaterial({
            side: THREE.DoubleSide,
            transparent: true,
            uniforms: { uZoom: { value: 1.0 }, uColor: { value: new THREE.Color(0x333b45) } },
            vertexShader: `varying vec3 vWorldPosition; void main() { vec4 worldPosition = modelMatrix * vec4(position, 1.0); vWorldPosition = worldPosition.xyz; gl_Position = projectionMatrix * viewMatrix * worldPosition; }`,
            fragmentShader: `varying vec3 vWorldPosition; uniform float uZoom; uniform vec3 uColor; float grid(vec2 uv, float res) { vec2 grid = fract(uv * res); vec2 d = fwidth(uv * res); vec2 line = smoothstep(d, vec2(0.0), grid); return max(line.x, line.y); } void main() { float g1 = grid(vWorldPosition.xy, 0.1); float g2 = grid(vWorldPosition.xy, 1.0); float alpha = mix(0.1, 0.3, g1); if(g2 > 0.0) alpha = max(alpha, 0.05); gl_FragColor = vec4(uColor, alpha); if(alpha < 0.06) discard; }`
        });

        const gridPlane = new THREE.Mesh(new THREE.PlaneGeometry(100000, 100000), gridMaterial);
        gridPlane.position.z = -1;
        scene.add(gridPlane);

        const mainGroup = new THREE.Group();
        const fontLoader = new FontLoader();

        fontLoader.load(FONT_URL, (font) => {
            processEntities(dxf.entities, font, dxf, mainGroup);
            scene.add(mainGroup);
            const box = new THREE.Box3().setFromObject(mainGroup);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y);
            camera.zoom = (frustumSize / (maxDim || 1)) * 0.9;
            camera.position.set(center.x, center.y, 10000);
            camera.updateProjectionMatrix();
            controls.target.set(center.x, center.y, 0);
            controls.update();
        });


        const animate = () => {
            requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        };
        animate();
    };

    useEffect(() => {
        fetch(currentFile).then(res => res.text()).then(data => renderDxf(data));
    }, [currentFile]);

    return (
        <div className="w-full h-screen bg-[#212830] flex flex-col overflow-hidden">
            <Header
                currentFile={currentFile}
                drawingFiles={drawingFiles}
                onFileSelect={setCurrentFile}
            />
            <div className="flex-1 relative">
                <div ref={containerRef} className="w-full h-full cursor-crosshair" />
                <div className="absolute bottom-8 right-8 pointer-events-none flex flex-col items-center font-mono">


                </div>
            </div>
        </div>
    );
};

export default CADViewer;