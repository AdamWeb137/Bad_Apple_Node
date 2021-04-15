const fs = require("fs");
const jimp = require("jimp");
const https = require("https");
const { color } = require("jimp");

module.exports = {
    emoji_color_dict:JSON.parse(fs.readFileSync('./emoji_color_dict.json', {encoding:'utf8'})),
    black_and_white_dict:{
        "black":["🌚","⬛","👥","🎓","🔌"],
        "white":["⬜","💭","📃","🏐","🥚"],
    },
    e_size:16,
    supported_formats:[
        "png",
        "jpg",
        "jpeg",
    ],
    find_politician_article:function(politician){
        return new Promise((resolve, reject)=>{
            let url = `https://en.wikipedia.org/w/api.php?action=query&origin=*&format=json&generator=search&gsrnamespace=0&gsrlimit=1&gsrsearch=%27${politician}%27`;
            let response = false;
            https.get(url, (resp)=>{
                let data = '';
                resp.on('data', (chunk)=>{
                    data += chunk;
                });
                resp.on('end', () => {
                    let result = JSON.parse(data);

                    if(!("query" in result)){
                        reject("No img");
                    }

                    let pages = result.query.pages;
                    let first = pages[Object.keys(pages)[0]];
                    response = first.pageid;

                    resolve(response);

                });
            }).on("error",(err)=>{reject(err.message)});
        });
    },
    get_politician_img_url: function(politician){
        return new Promise((resolve,reject)=>{
            module.exports.find_politician_article(politician).then(id=>{
                let url = `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&format=json&piprop=original&pageids=${id}`;
                https.get(url, (resp)=>{
                    let data = '';
                    resp.on('data',chunk=>{
                        data += chunk;
                    });
                    resp.on('end',()=>{
                        
                        let result = JSON.parse(data);
                        if(!("query" in result)){
                            resolve(false);
                            return;
                        }

                        let pages = result.query.pages;
                        let first = pages[Object.keys(pages)[0]];

                        if(!("original" in first)){
                            resolve(false);
                            return;
                        }

                        let split = first.original.source.split(".");

                        if(supported_formats.indexOf(split[split.length-1]) == -1){
                            resolve(false);
                            return;
                        }

                        resolve(first.original.source);

                    });
                });
            }).catch(error=>{
                resolve(false);
            });
        });
    },
    return_resize:async function(img_path){
        let image = await jimp.read(img_path);
        await image.resize(e_size,e_size);
        return image;
    },
    get_color_distance:function (a1, a2){
        return Math.sqrt(Math.abs(a2[0]-a1[0]) + Math.abs(a2[1]-a1[1]) + Math.abs(a2[2]-a1[2]));
    },
    get_closest_emoji:function(rgb, color_dict=module.exports.emoji_color_dict){
        let closest_dis = Number.POSITIVE_INFINITY;
        let closest_emoji = "";

        for(let e in color_dict){
            let dis_to_emoji = module.exports.get_color_distance(rgb, color_dict[e]);
            if(closest_dis > dis_to_emoji){
                closest_dis = dis_to_emoji;
                closest_emoji = e;
            }
        }

        return closest_emoji;

    },
    rgb_dict_to_arr:function(dict){
        return [dict.r, dict.g, dict.b];
    },
    image_to_emoji:async function(path_name){
        let image_str = "";
        await module.exports.return_resize(path_name).then(result=>{
            for(let y = 0; y < e_size; y++){
                for(let x = 0; x < e_size; x++){
                    let rgb = module.exports.rgb_dict_to_arr(jimp.intToRGBA(result.getPixelColour(x,y)));
                    image_str += get_closest_emoji(rgb);
                }
                image_str+="\n";
            }
        });
        return image_str;
    },
    image_no_resize_to_emoji: async function(img_path){
        let image_str = "";
        let img_data = await jimp.read(img_path);
        for(let y = 0; y < img_data.bitmap.height; y++){
            for(let x = 0; x < img_data.bitmap.width; x++){
                let rgb = module.exports.rgb_dict_to_arr(jimp.intToRGBA(img_data.getPixelColour(x,y)));

                image_str += module.exports.get_closest_emoji(rgb);
            }
            image_str+="\n";
        }
        return image_str;
    },
    image_black_white_to_emoji: async function(img_path){
        let image_str = "";
        let img_data = await jimp.read(img_path);
        for(let y = 0; y < img_data.bitmap.height; y++){
            for(let x = 0; x < img_data.bitmap.width; x++){
                let rgb = module.exports.rgb_dict_to_arr(jimp.intToRGBA(img_data.getPixelColour(x,y)));
                if(module.exports.get_color_distance([255,255,255],rgb) < module.exports.get_color_distance([0,0,0],rgb)){
                    let r = Math.floor(Math.random()*module.exports.black_and_white_dict["white"].length);
                    image_str+=module.exports.black_and_white_dict["white"][r];
                }else{
                    let r = Math.floor(Math.random()*module.exports.black_and_white_dict["black"].length);
                    image_str+=module.exports.black_and_white_dict["black"][r];
                }
            }
            image_str+="\n";
        }
        return image_str;
    },
    wikipedia_politician_to_emoji:function(politician){
        return new Promise((resolve,reject)=>{
            module.exports.get_politician_img_url(politician).then(url=>{
                if(url == false){
                    reject("url was false");
                    return;
                }

                module.exports.image_to_emoji(url).then(img=>{
                    resolve(img);
                }).catch(error=>{
                    reject(error);
                });
            }).catch(error=>{
                reject(error);
            });
        });
    }

}