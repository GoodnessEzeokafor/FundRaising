const contractSource = `
payable contract Project=
  record project ={
    id:int,
    creator:address,
    title:string,
    description:string,
    createdAt:int,
    deadline:int,
    amountGoal:int,
    total:int }
  record contribution={
      id:int,
      contributors : address,
      amount:int}

  record state ={
    index_counter:int,
    index_contribution_counter:int,
    currentBalance:int,
    projects:map(int,project),
    contributions:map(int,contribution)}

  entrypoint init()={
    index_contribution_counter=0,
    index_counter=0,
    currentBalance=0,
    projects={},
    contributions={}}

  entrypoint getProjectLength():int=
    state.index_counter

  entrypoint getContributionLength():int=
    state.index_contribution_counter

  stateful entrypoint add_project(
                        _title:string,
                        _description:string,
                        _deadline:int,
                        _amountGoal:int) =
    let stored_project = {id=getProjectLength() + 1,
                        title=_title,
                        description=_description, 
                        createdAt=Chain.timestamp,
                        creator = Call.caller,
                        deadline=_deadline,
                        amountGoal=_amountGoal,
                        total=0}
    let index = getProjectLength() + 1
    put(state{projects[index]=stored_project,index_counter=index})

  entrypoint getCurrentBalance()=
    state.currentBalance

  entrypoint get_project_by_index(index:int) : project = 
    switch(Map.lookup(index, state.projects))
      None => abort("Project does not exist with this index")
      Some(x) => x  

  entrypoint get_contribution_by_index(index:int) = 
    switch(Map.lookup(index, state.contributions))
      None => abort("Project does not exist with this index")
      Some(x) => x  
      
  payable stateful entrypoint contribute(_id:int)=
    let project = get_project_by_index(_id) 
    let project_owner  = project.creator : address
    require(Chain.timestamp < project.deadline, "Project Has Expired")
    require(project.id > 0,abort("NOT A Project ID"))
    require(Call.caller != project_owner,abort("Cant Donate To Your Project"))
    require(Call.value > 0, "Donate More Than Zero Ae")
    let index = getContributionLength() + 1
    let total_balance = getCurrentBalance() + Call.value
    let new_project_total = project.total + Call.value
    let stored_contribution = {id=getContributionLength() + 1,
                        contributors=Call.caller,
                        amount=Call.value}
    let updated_project = {id=project.id,
                        title=project.title,
                        description=project.description, 
                        createdAt=project.createdAt,
                        creator = project_owner,
                        deadline=project.deadline,
                        amountGoal=project.amountGoal,
                        total=new_project_total}
    put(state{projects[_id]=updated_project,contributions[index]=stored_contribution, index_contribution_counter=index,currentBalance = total_balance})
    
  payable stateful entrypoint payout(_id:int) = 
    let project = get_project_by_index(_id)
    let total_balance = getCurrentBalance()
    require(project.total >= project.amountGoal,"Goal Not Met")
    require(Call.caller == project.creator, "Must Be The Project Creator")
    Chain.spend(project.creator, total_balance)

`
const contractAddress ='ct_279z1kht4CDbZgZxPruTPC21Dxy2JTKXB8kzCoGBXzpUvXQePP'

var client = null // client defuault null
user_address =null // clienr user address default null
var projectArr = [] // empty projects array
var contributorsArr = [] //empty contributors array
var projectListLength = 0 // empty product list lenghth
var contributorListLength = 0

// asychronus read from the blockchain
async function callStatic(func, args) {
  const contract = await client.getContractInstance(contractSource, {contractAddress});
  const calledGet = await contract.call(func, args, {callStatic: true}).catch(e => console.error(e));
  const decodedGet = await calledGet.decode().catch(e => console.error(e));
  return decodedGet;
}

//Create a asynchronous write call for our smart contract
async function contractCall(func, args, value) {
  const contract = await client.getContractInstance(contractSource, {contractAddress});
  console.log("Contract:", contract)
  const calledSet = await contract.call(func, args, {amount:value}).catch(e => console.error(e));
  console.log("CalledSet", calledSet)
  return calledSet;
}


// mustche

function renderProjectList(){
  let template = $('#template').html();
  Mustache.parse(template);
  var rendered = Mustache.render(template, {projectArr});
  $("#getProject").html(rendered); // id to render your temlplate
  console.log("Project Template Display")
}


function renderContributorList(){
  let template = $('#contributor').html();
  Mustache.parse(template);
  var rendered = Mustache.render(template, {contributorsArr});
  $("#getContributors").html(rendered); // id to render your temlplate
  console.log("Contributors Template Display")
}





window.addEventListener('load', async() => {
  $("#loader").show();

  client = await Ae.Aepp();
  user_address = await client.address()

  console.log("Client:",client)
  console.log("Client Address", user_address);
  projectListLength = await callStatic('getProjectLength',[]);
  contributorListLength = await callStatic('getContributionLength',[])
  // projectListLength = await callStatic('getFileLength',[]);
  console.log('Project Length: ', projectListLength);
  console.log('Contributor Length: ', contributorListLength)


  // Project Loop
  for(let i = 1; i < projectListLength + 1; i++){
    const getProjectList = await callStatic('get_project_by_index', [i]);
    projectArr.push({
      index_counter:i,
      title:getProjectList.title,
      id:getProjectList.id,
      description:getProjectList.description,
      createdAt:new Date(getProjectList.createdAt),
      creator:getProjectList.creator,
      goal:Math.floor(getProjectList.amountGoal/1000000000000000000) ,
      total:Math.floor(getProjectList.total/1000000000000000000),
      deadline:new Date(getProjectList.deadline) 
    })
}

//contributor Loop
for(let i = 1; i < contributorListLength + 1; i++){
  const getContributorList = await callStatic('get_contribution_by_index', [i]);
  contributorsArr.push({
    index_counter:i,
    address:getContributorList.contributors,
    amount:Math.floor(getContributorList.amount / 1000000000000000000)
  })
}
renderProjectList();  
renderContributorList()
$("#loader").hide();
})


// add project
//click the Create Button
$("#addButton").click(async function(){
  console.log("Button Clicked....");
  $("#loader").show();

  var title = ($("#title").val());
  var description = ($("#description").val());
  var deadline =($("#deadline").val()) ;
  var goal = ($("#goal").val());

  console.log(title,description,deadline,goal)
  var new_deadline = new Date(deadline).getTime()

  // console.log(new Date(new_deadline))
  const new_project = await contractCall('add_project', [title, description, new_deadline,parseInt(goal*1000000000000000000,10)],0);
console.log("##########START########")
console.log("New Project:", new_project)
console.log("New Project Title:",new_project.title)
console.log("New Project Description:",new_project.description)
console.log("New Project Deadline:",new_project.deadline)
console.log("New Project Goal:",new_project.amountGoal)
console.log("#########END###########")

  // // clear
  $("#title").val("");
  $("#description").val("");
  $("#deadline").val("");
  $("#goal").val("");
  $("#loader").hide();

})
 
// Fund Project
$("#getProject").on("click",".fundProj", async function(event){
  $("#loader").show();

  console.log("Fund Project Clicked")
  const dataIndex = event.target.id

  console.log(typeof dataIndex)
  console.log("Donate Just 2ae")
  const fund_project = await contractCall('contribute', [dataIndex],2*1000000000000000000);

  console.log("-----------------")
  console.log("Data Index:", dataIndex)
  console.log("--------------------------")
  
  console.log("Just Clicked The Buy Button")
  event.preventDefault();
  $("#loader").hide();
  // window.location.reload(true);
});


//cashout

/*
########### CASH OUT  #################


*/

$("#getProject").on("click",".payout", async function(event){
  $("#loader").show();

  console.log("Payout Button Clicked Clicked")
  const dataIndex = event.target.id

  console.log(typeof dataIndex)
  console.log("Cash Out")
  console.log("Only Project Creator Can... Please")
  const cashout = await contractCall('payout', [dataIndex],0);

  console.log("-----------------")
  console.log("Data Index:", dataIndex)
  console.log("Cash Out:",cashout)
  console.log("--------------------------")
  
  console.log("Just Clicked The Buy Button")
  event.preventDefault();
  $("#loader").hide();
  // window.location.reload(true);
});

// Navigtion Link
$("#fund_project_href").click(function(){
  console.log("Fund Project Button Clicked .....");
  /////

  $("#add_project_form").hide()
  $("#getContributors").hide()
  
  $("#getProject").show()
  renderProjectList() 
})
$("#add_project_href").click(function(){
  console.log("add Project Clicked");
  $("#getContributors").hide()
  $("#getProject").hide()
  $("#add_project_form").show()
})

// click list event nav
$("#list_contributor_href").click(function(){
  console.log("List Event");
  /////
  $("#getProject").hide()
  $("#add_project_form").hide()
  $("#getContributors").show()
  renderContributorList() 
})
// click list evenclick list nav
