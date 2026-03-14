const drop = document.getElementById("drop");
const input = document.getElementById("fileInput");
const inputCanvas = document.getElementById("inputCanvas");
const inputCtx = inputCanvas.getContext("2d");

const outputCanvas = document.getElementById("outputCanvas");
const outputCtx = outputCanvas.getContext("2d");

const inputInfo = document.getElementById("inputInfo");
const outputInfo = document.getElementById("outputInfo");

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

function formatSize(bytes){
    return (bytes/1024/1024).toFixed(2)+" MB";
}

function ratio(w,h){
    return (w/h).toFixed(3)+" : 1";
}

function loadFile(file){

    const img = new Image();

    img.onload = ()=>{
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
    アスペクト比: ${ratio(w,h)}<br>
    更新日時: ${new Date(file.lastModified).toLocaleString()}
    `;
}

function processImage(img){

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

    showOutputInfo();
    
    /* クロップライン描画 */
    inputCtx.strokeStyle="red";
    inputCtx.lineWidth=4;

    inputCtx.beginPath();
    inputCtx.moveTo(left,0);
    inputCtx.lineTo(left,height);
    inputCtx.stroke();

    inputCtx.beginPath();
    inputCtx.moveTo(right,0);
    inputCtx.lineTo(right,height);
    inputCtx.stroke();
}

function showOutputInfo(){

    const w=outputCanvas.width;
    const h=outputCanvas.height;

    const dataUrl = outputCanvas.toDataURL("image/png");

    const base64 = dataUrl.split(",")[1];
    const size = Math.round(base64.length*0.75);

    outputInfo.innerHTML = `
    解像度: ${w} × ${h}<br>
    アスペクト比: ${ratio(w,h)}<br>
    推定ファイルサイズ: ${formatSize(size)}
    `;
}

document.getElementById("download").onclick=()=>{

    const link = document.createElement("a");
    link.download = "cropped.png";
    link.href = outputCanvas.toDataURL("image/png");
    link.click();

}
