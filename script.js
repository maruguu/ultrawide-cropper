const drop = document.getElementById("drop");
const input = document.getElementById("fileInput");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

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

function loadFile(file){

    const img = new Image();

    img.onload = ()=>{
        processImage(img);
    };

    img.src = URL.createObjectURL(file);
}

function processImage(img){

    canvas.width = img.width;
    canvas.height = img.height;

    ctx.drawImage(img,0,0);

    const imgData = ctx.getImageData(0,0,canvas.width,canvas.height);
    const data = imgData.data;

    const width = canvas.width;
    const height = canvas.height;

    function isBlackColumn(x){

        for(let y=0;y<height;y+=10){

            const i = (y*width + x)*4;

            const r = data[i];
            const g = data[i+1];
            const b = data[i+2];

            if(r>25 || g>25 || b>25){
                return false;
            }
        }

        return true;
    }

    let left = 0;
    let right = width-1;

    while(left < width && isBlackColumn(left)) left++;
    while(right > 0 && isBlackColumn(right)) right--;

    const cropWidth = right-left;

    const cropped = ctx.getImageData(left,0,cropWidth,height);

    canvas.width = cropWidth;
    canvas.height = height;

    ctx.putImageData(cropped,0,0);
}

document.getElementById("download").onclick=()=>{

    const link = document.createElement("a");
    link.download = "cropped.png";
    link.href = canvas.toDataURL("image/png");
    link.click();

}
