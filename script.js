const drop = document.getElementById("drop");
const input = document.getElementById("fileInput");
const inputCanvas = document.getElementById("inputCanvas");
const inputCtx = inputCanvas.getContext("2d");

const outputCanvas = document.getElementById("outputCanvas");
const outputCtx = outputCanvas.getContext("2d");

const inputInfo = document.getElementById("inputInfo");
const outputInfo = document.getElementById("outputInfo");

let originalImage = null;

window.addEventListener("DOMContentLoaded", ()=>{
    loadSettings();
});

input.addEventListener("change", e=>{
    loadFile(e.target.files[0]);
});

drop.addEventListener("dragover", e=>{
    e.preventDefault();
});

drop.addEventListener("drop", e=>{
    e.preventDefault();
    loadFile(e.dataTransfer.files[0]);
});

document.querySelectorAll(
'input[name="cropMode"]'
).forEach(r=>{
    r.addEventListener("change", saveSettings);
});

document.getElementById("preset").addEventListener("change", saveSettings);

function formatSize(bytes){
    return (bytes/1024/1024).toFixed(2)+" MB";
}

function loadFile(file){

    const img = new Image();

    img.onload = ()=>{
        originalImage = img; 
        showInputInfo(file,img);
        processImage(img);
    };

    img.src = URL.createObjectURL(file);
}

function showInputInfo(file,img){

    const w = img.width;
    const h = img.height;

    inputInfo.innerHTML = `
    ファイル名: ${file.name}<br>
    ファイルサイズ: ${formatSize(file.size)}<br>
    MIME: ${file.type}<br>
    解像度: ${w} × ${h}<br>
    アスペクト比: ${getCommonAspectRatio(w,h)}<br>
    更新日時: ${new Date(file.lastModified).toLocaleString()}
    `;
}

function processImage(img){
    let rect;
    const mode = document.querySelector('input[name="cropMode"]:checked').value;
    if(mode === "auto"){
        rect = cropAuto(img);
    }else{
        rect = cropPreset(img);
    }

    showOutputInfo();
    drawCropLine(rect);
}

function cropAuto(img){
    const width=img.width;
    const height=img.height;

    inputCanvas.width=width;
    inputCanvas.height=height;

    inputCtx.drawImage(img,0,0);

    const imgData=inputCtx.getImageData(0,0,width,height);
    const data=imgData.data;

    function isBlackColumn(x){

        for(let y=0;y<height;y+=10){

            const i=(y*width+x)*4;

            const r=data[i];
            const g=data[i+1];
            const b=data[i+2];

            if(r>25 || g>25 || b>25){
                return false;
            }
        }

        return true;
    }

    let left=0;
    let right=width-1;

    while(left<width && isBlackColumn(left)) left++;
    while(right>0 && isBlackColumn(right)) right--;

    /* クロップ処理 */

    const cropWidth=right-left+1;

    const cropped=inputCtx.getImageData(left,0,cropWidth,height);

    outputCanvas.width=cropWidth;
    outputCanvas.height=height;

    outputCtx.putImageData(cropped,0,0);

    return {"left": left, "top": 0, "width":width, "height":height};
}

function cropPreset(img){
    const width=img.width;
    const height=img.height;

    inputCanvas.width=width;
    inputCanvas.height=height;

    inputCtx.drawImage(img,0,0);

    const preset = document.getElementById("preset").value;

    const parts = preset.split("x");

    const targetW = parseInt(parts[0]);
    const targetH = parseInt(parts[1]);

    const sourceW = img.width;
    const sourceH = img.height;

    const targetAspect = targetW / targetH;
    const sourceAspect = sourceW / sourceH;

    let cropW, cropH;

    if(sourceAspect > targetAspect){

        cropH = sourceH;
        cropW = Math.round(sourceH * targetAspect);

    }else{

        cropW = sourceW;
        cropH = Math.round(sourceW / targetAspect);

    }

    const left = Math.round((sourceW - cropW) / 2);
    const top = Math.round((sourceH - cropH) / 2);

    const cropped = inputCtx.getImageData(left, top, cropW, cropH);

    outputCanvas.width = cropW;
    outputCanvas.height = cropH;

    outputCtx.putImageData(cropped, 0, 0);

    return {"left": left, "top": top, "width": cropW, "height": cropH};
}

function showOutputInfo(){

    const w=outputCanvas.width;
    const h=outputCanvas.height;

    const dataUrl = outputCanvas.toDataURL("image/png");

    const base64 = dataUrl.split(",")[1];
    const size = Math.round(base64.length*0.75);

    outputInfo.innerHTML = `
    解像度: ${w} × ${h}<br>
    アスペクト比: ${getCommonAspectRatio(w,h)}<br>
    推定ファイルサイズ: ${formatSize(size)}
    `;
}

/* クロップライン描画 */
function drawCropLine(rect){
    inputCtx.strokeStyle="red";
    inputCtx.lineWidth=4;
    
    inputCtx.strokeRect(rect.left, rect.top, rect.width, rect.height);
}

function saveSettings(){
    const mode =
    document.querySelector(
        'input[name="cropMode"]:checked'
    ).value;

    const preset =
    document.getElementById("preset").value;

    localStorage.setItem("cropMode", mode);
    localStorage.setItem("presetResolution", preset);
}

function loadSettings(){
    const mode = localStorage.getItem("cropMode");
    const preset = localStorage.getItem("presetResolution");
    if(mode){
        document.querySelector(
            `input[name="cropMode"][value="${mode}"]`
        ).checked = true;
    }

    if(preset){
        document.getElementById("preset").value = preset;
    }
}

function gcd(a,b){
    return b ? gcd(b, a % b) : a;
}

function getAspectRatio(width,height){
    const g = gcd(width,height);
    const w = width / g;
    const h = height / g;
    return w + ":" + h;
}

function getCommonAspectRatio(width,height){
    if(width == 0 || height == 0){
        return "不明";
    } 
    const ratio = width / height;
    const presets = [
        [16,9],
        [21,9],
        [32,9],
        [16,10],
        [4,3],
        [3,2],
        [1,1]
    ];
    let best = null;
    let bestDiff = 999;
    for(const p of presets){
        const r = p[0]/p[1];
        const diff = Math.abs(ratio - r);
        if(diff < bestDiff){
            bestDiff = diff;
            best = p;
        }
    }

    // 許容誤差 (3440x1440を21:9と判定するには0.0556以上が必要)
    if(bestDiff < 0.07){
        return best[0] + ":" + best[1];
    }
    return getAspectRatio(width,height);
}

document.getElementById("recrop").onclick = ()=>{
    if(!originalImage) return;
    processImage(originalImage);
};

document.getElementById("download").onclick=()=>{

    const link = document.createElement("a");
    link.download = "cropped.png";
    link.href = outputCanvas.toDataURL("image/png");
    link.click();

}
