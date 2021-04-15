const fs = require("fs");
const to_emoji = require("./image_to_emoji");
const ffmpeg = require("ffmpeg");
const jimp = require("jimp");

let bad_apple_video = "video";
let frames_folder = "bad_apple_frames";

function sleep(millis) {
    return new Promise(resolve => setTimeout(resolve, millis));
}

function time_till_next(start_time, framerate=30){
    let time_elapsed = Date.now()-start_time;
    let oneframe = (1/framerate)*1000;
    return {
        skipped:Math.floor(time_elapsed/oneframe),
        left:oneframe-(time_elapsed%oneframe)
    };
}

async function print_frames(end_frame, framerate=30){
    for(let i = 1; i < end_frame+1; i++){

        let start = Date.now();

        let file_name = `${frames_folder}/${bad_apple_video}_${i}.jpg`;
        let frame_str = await to_emoji.image_black_white_to_emoji(file_name);
        
        console.clear();
        process.stdout.moveCursor(0);
        console.log(frame_str);

        let till = time_till_next(start, framerate);
        i += till.skipped;
        await sleep(till.left);

    }
}

function extract_and_show(end_frame=6572, framerate=30){

    emoji_arr = [];

    try {

        async function save_all_frames(error, files){
            if(error){
                console.log(error);
                return;
            }

            print_frames(end_frame,framerate);

            console.clear();

        }

        let process = new ffmpeg(`${bad_apple_video}.mp4`);
        process.then(video => {
            video.fnExtractFrameToJPG(`${frames_folder}/`, {every_n_frames :1}, save_all_frames);
        }, err => {
            console.log('Error: ' + err);
        });
    } catch(e) {
        console.log(e);
    }

}

async function just_show(end_frame=6572, framerate=30){
    print_frames(end_frame,framerate);
    console.clear();
}

just_show();
//extract_and_show();